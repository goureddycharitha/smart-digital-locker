const bcrypt = require('bcrypt');
const { getDatabase } = require('../config/database');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Retrieves the profile of a user by ID.
 * Excludes the password hash for security.
 *
 * @param {number} userId
 * @returns {object} Safe user profile
 */
function getUserProfile(userId) {
  const db = getDatabase();
  const user = db
    .prepare('SELECT id, full_name, email, created_at, updated_at FROM users WHERE id = ?')
    .get(userId);

  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * Updates allowed profile fields (e.g. fullName) for a user.
 * Users cannot change their ID, email, or password through this method.
 *
 * @param {number} userId
 * @param {object} updates
 * @param {string} updates.fullName
 * @returns {object} Updated user profile
 */
function updateUserProfile(userId, { fullName }) {
  const db = getDatabase();

  const updateStmt = db.prepare(`
    UPDATE users
    SET full_name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = updateStmt.run(fullName.trim(), userId);

  if (result.changes === 0) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }

  return getUserProfile(userId);
}

/**
 * Changes a user's password securely after verifying their current password.
 *
 * @param {number} userId
 * @param {object} passwords
 * @param {string} passwords.currentPassword
 * @param {string} passwords.newPassword
 * @returns {Promise<{ message: string }>}
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  const db = getDatabase();

  const user = db
    .prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .get(userId);

  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }

  // Verify the current password against stored bcrypt hash
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 400;
    throw error;
  }

  // Prevent setting the exact same password
  if (currentPassword === newPassword) {
    const error = new Error('New password must be different from current password.');
    error.statusCode = 400;
    throw error;
  }

  // Hash new password securely
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newPasswordHash, userId);

  return { message: 'Password changed successfully.' };
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword
};

