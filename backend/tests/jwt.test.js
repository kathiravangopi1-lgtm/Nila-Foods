const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { generateAccessToken } = require('../utils/jwt');

test('access tokens default to a seven-day lifetime', () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousExpiry = process.env.JWT_EXPIRES_IN;

  process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters-long';
  delete process.env.JWT_EXPIRES_IN;

  try {
    const token = generateAccessToken({ _id: 'test-user', role: 'customer' });
    const payload = jwt.decode(token);

    assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;

    if (previousExpiry === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = previousExpiry;
  }
});
