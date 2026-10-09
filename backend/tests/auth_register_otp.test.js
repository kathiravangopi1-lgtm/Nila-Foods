const assert = require('node:assert/strict');
const test = require('node:test');
const { createRegisterHandler, login } = require('../controllers/auth_controller');
const UserModel = require('../models/user');
const { hashPassword } = require('../utils/password');

const callRegister = async (handler, body) => {
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

test('registration creates an unverified user, sends an OTP, and returns no OTP', async () => {
  let created;
  let issueRequest;
  class User {
    constructor(fields) {
      created = fields;
    }

    async save() {
      return { ...created, _id: 'user-1' };
    }

    static async findOne() {
      return null;
    }
  }
  const handler = createRegisterHandler({
    User,
    passwordHasher: async () => 'bcrypt-hash',
    sendVerificationEmail: async (_email, otp) => { deliveredCode = otp; },
    service: {
      issue: async (request) => {
        issueRequest = request;
        await request.sendEmail(request.email, 'test-only-otp');
      },
    },
  });
  let deliveredCode;
  const result = await callRegister(handler, {
    name: 'Nila Customer',
    email: 'Person@Example.com',
    password: 'password-123',
    emailOffersOptIn: true,
  });
  assert.equal(result.statusCode, 201);
  assert.equal(created.email, 'person@example.com');
  assert.equal(created.password, 'bcrypt-hash');
  assert.equal(created.emailVerified, false);
  assert.equal(issueRequest.purpose, 'EMAIL_VERIFICATION');
  assert.equal(issueRequest.userId, 'user-1');
  assert.equal(result.body.requiresEmailVerification, true);
  assert.equal(result.body.email, 'person@example.com');
  assert.equal(JSON.stringify(result.body).includes(deliveredCode), false);
});

test('password login refuses an unverified account even when its password is correct', async (t) => {
  process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-123456';
  const user = {
    _id: 'user-1',
    email: 'person@example.com',
    password: await hashPassword('password-123'),
    emailVerified: false,
  };
  t.mock.method(UserModel, 'findOne', () => ({ select: async () => user }));
  const result = await callRegister(login, { email: user.email, password: 'password-123' });
  assert.equal(result.statusCode, 403);
  assert.equal(result.body.code, 'EMAIL_VERIFICATION_REQUIRED');
});
