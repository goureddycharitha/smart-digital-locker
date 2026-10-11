const fs = require('fs');
const path = require('path');
const documentService = require('../services/documentService');

/**
 * Controller to handle document upload
 * POST /api/documents
 */
async function uploadDocument(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: 'A file is required for upload.'
    });
  }

  try {
    const { title, description, category } = req.body;

    const document = documentService.createDocument({
      userId: req.user.id,
      title,
      description,
      category,
      originalFileName: path.basename(req.file.originalname),
      storedFileName: path.basename(req.file.filename),
      mimeType: req.file.mimetype,
      fileSize: req.file.size
    });

    return res.status(201).json({
      message: 'Document uploaded successfully',
      ...document
    });
  } catch (error) {
    // Clean up uploaded file if database insertion or processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // Silently catch secondary unlink failures
      }
    }
    next(error);
  }
}

/**
 * Controller to list all user documents with search, filter, pagination
 * GET /api/documents
 */
async function getDocuments(req, res, next) {
  try {
    const { page, limit, search, category } = req.query;
    const result = documentService.getDocuments({
      userId: req.user.id,
      page,
      limit,
      search,
      category
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to view single document metadata
 * GET /api/documents/:id
 */
async function getDocumentById(req, res, next) {
  try {
    const document = documentService.getDocumentById(req.params.id, req.user.id);
    return res.status(200).json({ document });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to download a stored document
 * GET /api/documents/:id/download
 */
async function downloadDocument(req, res, next) {
  try {
    const { filePath, originalFileName, mimeType } = documentService.getDocumentForDownload(
      req.params.id,
      req.user.id
    );

    // Sanitize download filename to prevent HTTP header injection
    const safeDownloadName = originalFileName.replace(/["\r\n\\]/g, '_');

    res.setHeader('Content-Type', mimeType);
    return res.download(filePath, safeDownloadName, (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to delete a document and its storage file
 * DELETE /api/documents/:id
 */
async function deleteDocument(req, res, next) {
  try {
    documentService.deleteDocument(req.params.id, req.user.id);
    // 204 No Content as specified in requirements
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update document metadata (title, category, description)
 * PUT /api/documents/:id
 */
async function updateDocument(req, res, next) {
  try {
    const { title, description, category } = req.body;
    const updated = documentService.updateDocument(req.params.id, req.user.id, {
      title,
      description,
      category
    });

    return res.status(200).json({
      message: 'Document updated successfully',
      document: updated
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  deleteDocument,
  updateDocument
};

