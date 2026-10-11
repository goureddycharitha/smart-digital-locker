const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  validate,
  updateProfileValidationRules,
  changePasswordValidationRules
} = require('../utils/validationUtils');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// GET /api/users/me - Retrieve current authenticated profile
router.get('/me', userController.getCurrentUser);

// PUT /api/users/me - Update permitted profile fields
router.put(
  '/me',
  updateProfileValidationRules,
  validate,
  userController.updateCurrentUser
);

// PUT /api/users/change-password - Change account password
router.put(
  '/change-password',
  changePasswordValidationRules,
  validate,
  userController.changePassword
);

module.exports = router;

