const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const test = require('node:test');
const { requireAuth, requireRole } = require('../middleware/require_auth');

process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-123456';

const callMiddleware = (middleware, authorization) => {
  const result = { statusCode: 200, body: null, next: false, error: null };
  const req = { get: () => authorization };
  const res = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };
  middleware(req, res, (error) => {
    result.next = true;
    result.error = error;
  });
  return result;
};

test('authentication rejects missing, malformed, and expired bearer tokens', () => {
  const missing = callMiddleware(requireAuth, undefined);
  const malformed = callMiddleware(requireAuth, 'Bearer not-a-jwt');
  const expiredToken = jwt.sign(
    { role: 'customer' },
    process.env.JWT_SECRET,
    { subject: '507f1f77bcf86cd799439011', expiresIn: -1, algorithm: 'HS256' },
  );
  const expired = callMiddleware(requireAuth, `Bearer ${expiredToken}`);

  assert.equal(missing.statusCode, 401);
  assert.equal(malformed.statusCode, 401);
  assert.equal(expired.statusCode, 401);
  assert.match(expired.body.message, /expired/i);
});

test('a customer token cannot pass admin role middleware', () => {
  const request = { user: { id: 'customer-1', role: 'customer' } };
  const result = { statusCode: 200, body: null, next: false };
  const response = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };
  requireRole('admin')(request, response, () => { result.next = true; });
  assert.equal(result.statusCode, 403);
  assert.equal(result.next, false);
});
