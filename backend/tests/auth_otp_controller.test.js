const assert = require('node:assert/strict');
const test = require('node:test');
const { createAuthOtpController } = require('../controllers/auth_otp_controller');

const callHandler = async (handler, body) => {
  const result = { statusCode: 200, body: null, error: null };
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
  await handler({ body }, res, (error) => { result.error = error; });
  if (result.error) throw result.error;
  return result;
};

test('email verification marks the matching user verified after consuming a valid OTP', async () => {
  let updatedUser;
  const controller = createAuthOtpController({
    User: {
      findOneAndUpdate: async (query, update) => {
        updatedUser = { query, update };
        return { _id: 'user-1' };
      },
    },
    otpService: { verify: async () => ({ record: { userId: 'user-1' } }) },
  });
  const result = await callHandler(controller.verifyEmail, { email: 'Person@Example.com', otp: '123456' });
  assert.equal(result.statusCode, 200);
  assert.equal(updatedUser.query.email, 'person@example.com');
  assert.equal(updatedUser.update.$set.emailVerified, true);
});

test('forgot password returns a generic response for both unknown and known accounts', async () => {
  const issued = [];
  const user = { _id: 'user-1' };
  const makeController = (foundUser) => createAuthOtpController({
    User: { findOne: async () => foundUser },
    otpService: {
      issue: async (payload) => issued.push(payload),
    },
    sendResetEmail: async () => {},
  });
  const unknown = await callHandler(makeController(null).forgotPassword, { email: 'person@example.com' });
  const known = await callHandler(makeController(user).forgotPassword, { email: 'person@example.com' });
  assert.equal(unknown.statusCode, known.statusCode);
  assert.equal(unknown.body.message, known.body.message);
  assert.equal(unknown.body.message, 'If an account exists for this email, a verification code has been sent.');
  assert.equal(issued.length, 1);
  assert.equal(issued[0].purpose, 'PASSWORD_RESET');
});

test('password reset verifies a one-time grant and stores a hash from the existing password utility', async () => {
  let updatedPassword;
  let claimedGrant;
  const controller = createAuthOtpController({
    User: {
      findOneAndUpdate: async (_query, update) => {
        updatedPassword = update.$set.password;
        return { _id: 'user-1' };
      },
    },
    otpService: {
      consumeResetToken: async (grant) => {
        claimedGrant = grant;
        return { userId: 'user-1' };
      },
    },
    passwordHasher: async (password) => `existing-bcrypt-hash:${password}`,
  });
  const result = await callHandler(controller.resetPassword, {
    email: 'Person@Example.com',
    resetToken: 'a'.repeat(64),
    newPassword: 'new-password-123',
  });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(claimedGrant, { email: 'person@example.com', resetToken: 'a'.repeat(64) });
  assert.equal(updatedPassword, 'existing-bcrypt-hash:new-password-123');
});

test('reset OTP verification returns only a reset grant, never the OTP', async () => {
  const controller = createAuthOtpController({
    otpService: { verify: async () => ({ resetToken: 'reset-grant-token' }) },
  });
  const result = await callHandler(controller.verifyResetOtp, { email: 'person@example.com', otp: '123456' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.resetToken, 'reset-grant-token');
  assert.equal(Object.hasOwn(result.body, 'otp'), false);
});
