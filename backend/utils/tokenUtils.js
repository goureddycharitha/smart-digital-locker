const jwt = require('jsonwebtoken');

/**
 * Returns the secret key for signing/verifying JWT tokens.
 * Fails safely if the secret is missing or below the required 32-character security threshold.
 * Never logs or exposes the secret.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing or empty.');
  }

  const trimmed = secret.trim();
  if (trimmed.length < 32) {
    throw new Error('FATAL: JWT_SECRET is insecure. Secret must be at least 32 characters long.');
  }

  return trimmed;
}

/**
 * Generates a signed JSON Web Token.
 *
 * @param {object} payload - Claims to embed in token (e.g. { id, email })
 * @param {string|number} [expiresIn] - Expiry string or seconds (default: process.env.JWT_EXPIRES_IN or '24h')
 * @returns {string} Signed JWT
 */
function generateToken(payload, expiresIn) {
  const secret = getJwtSecret();
  const options = {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '24h'
  };
  return jwt.sign(payload, secret, options);
}

/**
 * Verifies a JSON Web Token and returns its decoded payload.
 *
 * @param {string} token - The raw JWT token string
 * @returns {object} Decoded claims
 */
function verifyToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  verifyToken
};
