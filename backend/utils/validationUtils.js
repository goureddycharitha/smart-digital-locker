const fs = require('fs');
const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware that checks for express-validator errors and formats them into a clean 400 response.
 * If a file was uploaded in this request, cleans it up immediately to avoid orphaned files.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If a file was already stored by multer, remove it
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // Silently ignore secondary unlink error
      }
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors
    });
  }
  next();
}

/**
 * Validation rules for user registration
 */
const registerValidationRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .isLength({ max: 128 })
    .withMessage('Password must not exceed 128 characters')
];

/**
 * Validation rules for user login
 */
const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for user profile update
 */
const updateProfileValidationRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
];

/**
 * Validation rules for document query (pagination, search, filter)
 */
const documentQueryValidationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .isString(),

  query('category')
    .optional()
    .trim()
    .isString()
];

/**
 * Validation rules for document ID parameter
 */
const documentIdParamValidationRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Document ID must be a valid positive integer')
    .toInt()
];

/**
 * Validation rules for document creation (non-file form fields)
 */
const documentUploadValidationRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Document title is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Document title must be between 2 and 200 characters'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
];

/**
 * Validation rules for document metadata update (PUT /api/documents/:id)
 */
const documentUpdateValidationRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Document title is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Document title must be between 2 and 200 characters'),

  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
];

/**
 * Validation rules for user password change (PUT /api/users/change-password)
 */
const changePasswordValidationRules = [
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isString()
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .isLength({ max: 128 })
    .withMessage('New password must not exceed 128 characters')
];

module.exports = {
  validate,
  registerValidationRules,
  loginValidationRules,
  updateProfileValidationRules,
  documentQueryValidationRules,
  documentIdParamValidationRules,
  documentUploadValidationRules,
  documentUpdateValidationRules,
  changePasswordValidationRules
};

