const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../utils/jwt');

const requireAuth = (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ message: 'A Bearer access token is required.' });
  }

  try {
    const payload = verifyAccessToken(match[1]);
    if (!payload || typeof payload === 'string' || typeof payload.sub !== 'string') {
      return res.status(401).json({ message: 'Invalid access token.' });
    }

    req.user = {
      id: payload.sub,
      role: payload.role === 'admin' ? 'admin' : 'customer',
    };
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Access token has expired.' });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid access token.' });
    }

    return next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }

  return next();
};

module.exports = { requireAuth, requireRole };
