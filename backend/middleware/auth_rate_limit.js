const { rateLimit } = require('express-rate-limit');

const createLimiter = (limit, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: message,
    code: 'AUTH_RATE_LIMITED',
  }),
});

module.exports = {
  authRequestLimiter: createLimiter(10, 'Too many authentication requests. Please try again later.'),
  otpRequestLimiter: createLimiter(10, 'Too many code requests. Please try again later.'),
  otpVerifyLimiter: createLimiter(20, 'Too many verification attempts. Please try again later.'),
};
