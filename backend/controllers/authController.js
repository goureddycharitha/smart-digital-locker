const authService = require('../services/authService');

/**
 * Controller handling user registration
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { fullName, email, password } = req.body;
    const user = await authService.registerUser({ fullName, email, password });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller handling user login
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });

    return res.status(200).json({
      message: 'Login successful',
      token: result.token,
      tokenType: result.tokenType,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login
};
