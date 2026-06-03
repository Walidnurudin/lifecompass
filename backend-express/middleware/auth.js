const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { validate: validateUuid } = require('uuid');

function generateToken(userID) {
  // 72 hours matching Go code (72 * 3600 seconds)
  return jwt.sign(
    { user_id: userID },
    config.jwtSecret,
    { expiresIn: '72h' }
  );
}

function authMiddleware(req, res, next) {
  let tokenString = '';

  // 1. Try Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    tokenString = authHeader.substring(7);
  }

  // 2. Fall back to cookie
  if (!tokenString && req.cookies) {
    tokenString = req.cookies['token'];
  }

  if (!tokenString) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const decoded = jwt.verify(tokenString, config.jwtSecret);
    
    if (!decoded || !decoded.user_id) {
      return res.status(401).json({ error: 'Invalid token claims' });
    }

    const userIDStr = decoded.user_id;

    // Validate UUID format
    if (!validateUuid(userIDStr)) {
      return res.status(401).json({ error: 'Invalid user ID format' });
    }

    req.userID = userIDStr;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  generateToken,
  authMiddleware,
};
