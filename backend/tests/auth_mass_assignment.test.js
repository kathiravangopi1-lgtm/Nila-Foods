const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createUpdateCurrentUserHandler,
  updateCurrentUser,
} = require('../controllers/auth_controller');

test('profile updates reject role and other protected fields instead of mass-assigning them', async () => {
  const result = { statusCode: 200, body: null, next: false };
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
  await updateCurrentUser({
    user: { id: '507f1f77bcf86cd799439011' },
    body: { role: 'admin', emailVerified: true },
  }, res, () => { result.next = true; });
  assert.equal(result.statusCode, 400);
  assert.equal(result.next, false);
});

test('changing the account email marks it unverified and sends a verification OTP', async () => {
  const user = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Nila Customer',
    email: 'old@example.com',
    phone: '',
    role: 'customer',
    emailOffersOptIn: false,
    restockProductIds: [],
    emailVerified: true,
    save: async () => {},
  };
  let otpRequest;
  const updateProfile = createUpdateCurrentUserHandler({
    User: { findById: async () => user },
    service: { issue: async (request) => { otpRequest = request; } },
    sendVerificationEmail: async () => {},
  });
  const result = { statusCode: 200, body: null, next: false };
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

  await updateProfile({
    user: { id: user._id },
    body: { email: 'New@example.com' },
  }, res, () => { result.next = true; });

  assert.equal(result.statusCode, 200);
  assert.equal(user.email, 'new@example.com');
  assert.equal(user.emailVerified, false);
  assert.equal(result.body.requiresEmailVerification, true);
  assert.equal(otpRequest.email, 'new@example.com');
  assert.equal(otpRequest.userId, user._id);
  assert.equal(otpRequest.purpose, 'EMAIL_VERIFICATION');
  assert.equal(result.next, false);
});
