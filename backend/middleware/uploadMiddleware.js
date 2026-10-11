const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Determine and ensure uploads directory exists
const rawUploadDir = process.env.UPLOAD_DIR || './uploads';
const uploadDir = path.isAbsolute(rawUploadDir)
  ? rawUploadDir
  : path.resolve(process.cwd(), rawUploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 10 MB limit in bytes
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024;

// Permitted extensions and mime types
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', // Some clients send zip for docx
  'application/x-zip-compressed'
]);

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate safe, unguessable stored filename with crypto random hex
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(12).toString('hex')}${safeExt}`;
    cb(null, uniqueSuffix);
  }
});

// File filter based on extension and mime type
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(`File extension '${ext}' is not supported. Allowed extensions: PDF, JPG, PNG, TXT, DOCX.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase()) && file.mimetype !== 'application/octet-stream') {
    const error = new Error(`MIME type '${file.mimetype}' is not permitted.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  cb(null, true);
};

// Multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

/**
 * Validates the file content using magic byte signatures to prevent malicious file renaming.
 * Runs after multer has saved the file temporarily to disk.
 * If validation fails, removes the file and returns an error response.
 */
function validateFileSignature(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: 'A file is required for document upload.'
    });
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    let isValid = false;

    if (ext === '.pdf') {
      // PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46)
      isValid = bytesRead >= 4 && buffer.slice(0, 4).toString() === '%PDF';
    } else if (ext === '.png') {
      // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      isValid =
        bytesRead >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a;
    } else if (ext === '.jpg' || ext === '.jpeg') {
      // JPEG magic bytes: 0xFF 0xD8 0xFF
      isValid = bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    } else if (ext === '.docx') {
      // DOCX is a zipped Office Open XML package: starts with PK\x03\x04
      isValid =
        bytesRead >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04;
    } else if (ext === '.txt') {
      // Plain text: cannot start with MZ (executable), \x7fELF (Linux bin), or binary null bytes in initial chunk
      const hasExecutableHeader =
        (buffer[0] === 0x4d && buffer[1] === 0x5a) || // MZ
        (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46); // ELF
      const hasNullBytes = buffer.slice(0, bytesRead).includes(0x00);
      isValid = !hasExecutableHeader && !hasNullBytes;
    }

    if (!isValid) {
      // Delete malicious or mismatched file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(415).json({
        error: `File signature validation failed. The content of '${req.file.originalname}' does not match its declared type.`
      });
    }

    next();
  } catch (err) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore secondary unlink errors
      }
    }
    return res.status(500).json({
      error: 'Failed to inspect uploaded file contents.'
    });
  }
}

/**
 * Safely resolves a stored filename against the uploads directory.
 * Prevents directory traversal attacks (e.g. ../../etc/passwd).
 *
 * @param {string} storedFileName
 * @returns {string|null} Full safe path, or null if traversal detected
 */
function resolveSafeUploadPath(storedFileName) {
  // Strip any path delimiters to ensure it is purely a basename
  const sanitizedBaseName = path.basename(storedFileName);
  const fullPath = path.resolve(uploadDir, sanitizedBaseName);

  // Path must be strictly inside uploadDir
  if (!fullPath.startsWith(uploadDir + path.sep) && fullPath !== uploadDir) {
    return null;
  }

  return fullPath;
}

module.exports = {
  upload,
  validateFileSignature,
  resolveSafeUploadPath,
  uploadDir
};
