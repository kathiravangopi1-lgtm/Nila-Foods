const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters to sign or verify access tokens.');
  }

  return secret;
};

const generateAccessToken = (user) => {
  const userId = user && (user._id || user.id);
  if (!userId) {
    throw new TypeError('A user with an id is required to generate an access token.');
  }
  const role = user.role === 'admin' ? 'admin' : 'customer';

  return jwt.sign(
    { role },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      subject: String(userId),
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  );
};

const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret(), {
  algorithms: ['HS256'],
});

module.exports = { generateAccessToken, verifyAccessToken };
