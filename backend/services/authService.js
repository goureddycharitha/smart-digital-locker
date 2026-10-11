const bcrypt = require('bcrypt');
const { getDatabase } = require('../config/database');
const { generateToken } = require('../utils/tokenUtils');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Registers a new user.
 *
 * @param {object} userData
 * @param {string} userData.fullName
 * @param {string} userData.email
 * @param {string} userData.password
 * @returns {Promise<{ id: number, fullName: string, email: string }>}
 */
async function registerUser({ fullName, email, password }) {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  // Check if an account already exists with this email
  const existingUser = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail);

  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // Hash password securely with bcrypt
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Parameterized insert to prevent SQL injection
  const insertStmt = db.prepare(`
    INSERT INTO users (full_name, email, password_hash)
    VALUES (?, ?, ?)
  `);

  const result = insertStmt.run(fullName.trim(), normalizedEmail, passwordHash);

  return {
    id: Number(result.lastInsertRowid),
    fullName: fullName.trim(),
    email: normalizedEmail
  };
}

/**
 * Authenticates user credentials and generates a signed JWT.
 *
 * @param {object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ token: string, tokenType: string, user: { id: number, fullName: string, email: string } }>}
 */
async function loginUser({ email, password }) {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  // Find user by normalized email
  const user = db
    .prepare('SELECT id, full_name, email, password_hash FROM users WHERE email = ?')
    .get(normalizedEmail);

  // Generic message protects against user enumeration attacks
  const invalidCredentialsMessage = 'Invalid email or password.';

  if (!user) {
    const error = new Error(invalidCredentialsMessage);
    error.statusCode = 401;
    throw error;
  }

  // Compare bcrypt password hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error(invalidCredentialsMessage);
    error.statusCode = 401;
    throw error;
  }

  // Generate signed JWT token
  const token = generateToken({
    id: user.id,
    email: user.email
  });

  return {
    token,
    tokenType: 'Bearer',
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email
    }
  };
}

module.exports = {
  registerUser,
  loginUser
};
