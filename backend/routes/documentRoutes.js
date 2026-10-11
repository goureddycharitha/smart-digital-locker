const express = require('express');
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  upload,
  validateFileSignature
} = require('../middleware/uploadMiddleware');
const {
  validate,
  documentUploadValidationRules,
  documentQueryValidationRules,
  documentIdParamValidationRules,
  documentUpdateValidationRules
} = require('../utils/validationUtils');

const router = express.Router();

// All document routes require authentication
router.use(authenticateToken);

// POST /api/documents - Upload a new document
router.post(
  '/',
  upload.single('file'),
  validateFileSignature,
  documentUploadValidationRules,
  validate,
  documentController.uploadDocument
);

// GET /api/documents - View all documents with pagination, search & filter
router.get(
  '/',
  documentQueryValidationRules,
  validate,
  documentController.getDocuments
);

// GET /api/documents/:id - View single document metadata
router.get(
  '/:id',
  documentIdParamValidationRules,
  validate,
  documentController.getDocumentById
);

// PUT /api/documents/:id - Update document metadata
router.put(
  '/:id',
  documentIdParamValidationRules,
  documentUpdateValidationRules,
  validate,
  documentController.updateDocument
);

// GET /api/documents/:id/download - Download document file
router.get(
  '/:id/download',
  documentIdParamValidationRules,
  validate,
  documentController.downloadDocument
);

// DELETE /api/documents/:id - Delete document and file
router.delete(
  '/:id',
  documentIdParamValidationRules,
  validate,
  documentController.deleteDocument
);

module.exports = router;

