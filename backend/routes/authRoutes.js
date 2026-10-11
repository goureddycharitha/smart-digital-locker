const express = require('express');
const authController = require('../controllers/authController');
const {
  validate,
  registerValidationRules,
  loginValidationRules
} = require('../utils/validationUtils');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// User Registration: POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  registerValidationRules,
  validate,
  authController.register
);

// User Login: POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  loginValidationRules,
  validate,
  authController.login
);

module.exports = router;
