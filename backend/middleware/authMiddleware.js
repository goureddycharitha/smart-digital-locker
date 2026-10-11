const { verifyToken } = require('../utils/tokenUtils');
const { getDatabase } = require('../config/database');

/**
 * Authentication middleware that verifies JWT Bearer tokens
 * and attaches the authenticated user record to req.user.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || (req.get && req.get('authorization'));

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authentication required. Authorization header missing.'
    });
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: 'Authentication required. Format must be: Bearer <token>'
    });
  }

  const token = parts[1].replace(/^["']|["']$/g, '').trim();

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication failed. Token has expired.'
      });
    }
    return res.status(401).json({
      error: 'Authentication failed. Invalid token.'
    });
  }

  // Ensure user still exists in database
  try {
    const db = getDatabase();
    const user = db
      .prepare('SELECT id, full_name, email FROM users WHERE id = ?')
      .get(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed. User account not found.'
      });
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email
    };

    next();
  } catch (dbError) {
    next(dbError);
  }
}

module.exports = {
  authenticateToken
};
