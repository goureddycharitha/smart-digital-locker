const userService = require('../services/userService');

/**
 * Controller to fetch the authenticated user's profile
 * GET /api/users/me
 */
async function getCurrentUser(req, res, next) {
  try {
    const profile = userService.getUserProfile(req.user.id);
    return res.status(200).json({
      user: profile
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update the authenticated user's profile
 * PUT /api/users/me
 */
async function updateCurrentUser(req, res, next) {
  try {
    const { fullName } = req.body;
    const updatedProfile = userService.updateUserProfile(req.user.id, { fullName });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedProfile
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to change the authenticated user's password
 * PUT /api/users/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(req.user.id, {
      currentPassword,
      newPassword
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  changePassword
};

