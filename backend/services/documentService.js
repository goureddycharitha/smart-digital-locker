const fs = require('fs');
const { getDatabase } = require('../config/database');
const { resolveSafeUploadPath } = require('../middleware/uploadMiddleware');

/**
 * Creates a new document record associated with a specific user.
 *
 * @param {object} docData
 * @param {number} docData.userId
 * @param {string} docData.title
 * @param {string} [docData.description]
 * @param {string} docData.category
 * @param {string} docData.originalFileName
 * @param {string} docData.storedFileName
 * @param {string} docData.mimeType
 * @param {number} docData.fileSize
 * @returns {object} Clean document metadata
 */
function createDocument({
  userId,
  title,
  description,
  category,
  originalFileName,
  storedFileName,
  mimeType,
  fileSize
}) {
  const db = getDatabase();

  const insertStmt = db.prepare(`
    INSERT INTO documents (
      user_id,
      title,
      description,
      category,
      original_file_name,
      stored_file_name,
      mime_type,
      file_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    userId,
    title.trim(),
    description ? description.trim() : null,
    category.trim(),
    originalFileName,
    storedFileName,
    mimeType,
    fileSize
  );

  const docId = Number(result.lastInsertRowid);

  const inserted = db
    .prepare('SELECT id, title, description, category, original_file_name, mime_type, file_size, uploaded_at, updated_at FROM documents WHERE id = ?')
    .get(docId);

  return {
    id: inserted.id,
    title: inserted.title,
    description: inserted.description,
    category: inserted.category,
    originalFileName: inserted.original_file_name,
    mimeType: inserted.mime_type,
    fileSize: inserted.file_size,
    uploadedAt: inserted.uploaded_at,
    updatedAt: inserted.updated_at
  };
}

/**
 * Lists documents belonging to the authenticated user with filtering and pagination.
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search]
 * @param {string} [params.category]
 * @returns {object} { documents, pagination: { page, limit, total, totalPages } }
 */
function getDocuments({ userId, page = 1, limit = 10, search, category }) {
  const db = getDatabase();
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  // Build parameterized conditions
  const conditions = ['user_id = ?'];
  const params = [userId];

  if (search && search.trim() !== '') {
    conditions.push('title LIKE ?');
    params.push(`%${search.trim()}%`);
  }

  if (category && category.trim() !== '') {
    conditions.push('category = ?');
    params.push(category.trim());
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Query total count, aggregate storage and category count
  const countStmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(file_size), 0) as totalBytes,
      COUNT(DISTINCT category) as categoriesCount
    FROM documents 
    ${whereClause}
  `);
  const { total, totalBytes, categoriesCount } = countStmt.get(...params);

  // Query paginated items sorted by upload date descending
  const queryStmt = db.prepare(`
    SELECT id, title, description, category, original_file_name, mime_type, file_size, uploaded_at, updated_at
    FROM documents
    ${whereClause}
    ORDER BY uploaded_at DESC, id DESC
    LIMIT ? OFFSET ?
  `);

  const rows = queryStmt.all(...params, safeLimit, offset);

  const documents = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    originalFileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at
  }));

  const totalPages = Math.ceil(total / safeLimit) || 0;

  return {
    documents,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      totalBytes,
      categoriesCount
    }
  };
}

/**
 * Retrieves metadata for a single document owned by the user.
 *
 * @param {number} id
 * @param {number} userId
 * @returns {object} Document metadata
 */
function getDocumentById(id, userId) {
  const db = getDatabase();

  const doc = db
    .prepare(`
      SELECT id, title, description, category, original_file_name, mime_type, file_size, uploaded_at, updated_at
      FROM documents
      WHERE id = ? AND user_id = ?
    `)
    .get(id, userId);

  if (!doc) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    originalFileName: doc.original_file_name,
    mimeType: doc.mime_type,
    fileSize: doc.file_size,
    uploadedAt: doc.uploaded_at,
    updatedAt: doc.updated_at
  };
}

/**
 * Prepares a document for download after checking ownership and filesystem integrity.
 *
 * @param {number} id
 * @param {number} userId
 * @returns {{ filePath: string, originalFileName: string, mimeType: string }}
 */
function getDocumentForDownload(id, userId) {
  const db = getDatabase();

  const doc = db
    .prepare(`
      SELECT id, original_file_name, stored_file_name, mime_type
      FROM documents
      WHERE id = ? AND user_id = ?
    `)
    .get(id, userId);

  if (!doc) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  const safePath = resolveSafeUploadPath(doc.stored_file_name);
  if (!safePath || !fs.existsSync(safePath)) {
    const error = new Error('Document file is missing from storage.');
    error.statusCode = 404;
    throw error;
  }

  return {
    filePath: safePath,
    originalFileName: doc.original_file_name,
    mimeType: doc.mime_type
  };
}

/**
 * Deletes a document record and its associated physical file.
 *
 * @param {number} id
 * @param {number} userId
 */
function deleteDocument(id, userId) {
  const db = getDatabase();

  const doc = db
    .prepare('SELECT id, stored_file_name FROM documents WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!doc) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  // Delete physical file safely
  const safePath = resolveSafeUploadPath(doc.stored_file_name);
  if (safePath && fs.existsSync(safePath)) {
    try {
      fs.unlinkSync(safePath);
    } catch {
      // Continue to DB deletion even if disk unlink throws, or handle failure
    }
  }

  // Delete DB record
  const result = db
    .prepare('DELETE FROM documents WHERE id = ? AND user_id = ?')
    .run(id, userId);

  if (result.changes === 0) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }
}

/**
 * Updates metadata (title, description, category) for a document owned by the user.
 *
 * @param {number} id
 * @param {number} userId
 * @param {object} updates
 * @param {string} updates.title
 * @param {string} [updates.description]
 * @param {string} updates.category
 * @returns {object} Updated document metadata
 */
function updateDocument(id, userId, { title, description, category }) {
  const db = getDatabase();

  const doc = db
    .prepare('SELECT id, title, description, category FROM documents WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!doc) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  const newTitle = title !== undefined && title !== null ? title.trim() : doc.title;
  const newCategory = category !== undefined && category !== null ? category.trim() : doc.category;
  const newDescription =
    description !== undefined
      ? description !== null
        ? description.trim()
        : null
      : doc.description;

  const updateStmt = db.prepare(`
    UPDATE documents
    SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `);

  updateStmt.run(
    newTitle,
    newDescription,
    newCategory,
    id,
    userId
  );

  return getDocumentById(id, userId);
}

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  getDocumentForDownload,
  deleteDocument,
  updateDocument
};

