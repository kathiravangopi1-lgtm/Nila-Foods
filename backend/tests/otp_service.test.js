const assert = require('node:assert/strict');
const test = require('node:test');
const EmailOtp = require('../models/email_otp');
const {
  createOtpService,
  generateOtp,
  hashOtp,
  securelyMatches,
  MAX_ATTEMPTS,
  OTP_LIFETIME_MS,
  RESEND_COOLDOWN_MS,
} = require('../services/otp_service');

const SECRET = 'test-only-secret-that-is-long-enough-123456';

function createMemoryOtpModel() {
  let records = [];
  let sequence = 0;

  const matches = (record, query) => Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((branch) => matches(record, branch));
    if (key.startsWith('$')) return true;
    const actual = record[key];
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      return Object.entries(expected).every(([operator, value]) => {
        if (operator === '$lt') return actual < value;
        if (operator === '$gt') return new Date(actual).getTime() > new Date(value).getTime();
        if (operator === '$lte') return new Date(actual).getTime() <= new Date(value).getTime();
        if (operator === '$ne') return actual !== value;
        return false;
      });
    }
    return actual instanceof Date || expected instanceof Date
      ? new Date(actual).getTime() === new Date(expected).getTime()
      : actual === expected;
  });

  return {
    get records() { return records; },
    async findOne(query) {
      return records.find((record) => matches(record, query)) || null;
    },
    async findOneAndUpdate(query, update, options = {}) {
      let record = records.find((candidate) => matches(candidate, query));
      if (!record && options.upsert) {
        if (records.some((candidate) => candidate.email === query.email && candidate.purpose === query.purpose)) {
          const duplicate = new Error('Duplicate email/purpose record.');
          duplicate.code = 11000;
          throw duplicate;
        }
        record = {
          _id: `otp-${++sequence}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...update.$setOnInsert,
          ...Object.fromEntries(Object.entries(query).filter(([, value]) => typeof value !== 'object')),
        };
        records.push(record);
      }
      if (!record) return null;
      Object.assign(record, update.$set || {});
      for (const [key, amount] of Object.entries(update.$inc || {})) {
        record[key] = (record[key] || 0) + amount;
      }
      record.updatedAt = new Date();
      return record;
    },
    async findOneAndDelete(query) {
      const index = records.findIndex((record) => matches(record, query));
      if (index === -1) return null;
      return records.splice(index, 1)[0];
    },
    async deleteOne(query) {
      const index = records.findIndex((record) => matches(record, query));
      if (index !== -1) records.splice(index, 1);
      return { deletedCount: index === -1 ? 0 : 1 };
    },
  };
}

const createHarness = () => {
  process.env.JWT_SECRET = SECRET;
  const Otp = createMemoryOtpModel();
  let now = Date.now();
  const service = createOtpService({ Otp, clock: () => now });
  const sent = [];
  const sendEmail = async (email, otp) => sent.push({ email, otp });
  return {
    Otp,
    service,
    sent,
    sendEmail,
    setNow: (value) => { now = value; },
    getNow: () => now,
  };
};

test('OTP records have a unique active-purpose key and an expiresAt TTL index', () => {
  const indexes = EmailOtp.schema.indexes();
  assert.equal(indexes.some(([keys, options]) => (
    keys.email === 1 && keys.purpose === 1 && options.unique === true
  )), true);
  assert.equal(indexes.some(([keys, options]) => (
    keys.expiresAt === 1 && options.expireAfterSeconds === 0
  )), true);
});

test('OTP generation uses six decimal digits and hashes are keyed, non-plaintext values', () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    assert.match(generateOtp(), /^\d{6}$/);
  }
  const hash = hashOtp('123456', 'person@example.com', 'EMAIL_VERIFICATION', SECRET);
  assert.notEqual(hash, '123456');
  assert.equal(hash.length, 64);
  assert.equal(securelyMatches(hash, hash), true);
  assert.equal(securelyMatches(hash, hashOtp('654321', 'person@example.com', 'EMAIL_VERIFICATION', SECRET)), false);
  assert.equal(hashOtp('123456', 'person@example.com', 'EMAIL_VERIFICATION', SECRET), hash);
});

test('OTP issuance stores only a hash and applies the resend cooldown', async () => {
  const harness = createHarness();
  await harness.service.issue({
    email: 'person@example.com',
    userId: 'user-1',
    purpose: 'EMAIL_VERIFICATION',
    sendEmail: harness.sendEmail,
  });
  assert.equal(harness.Otp.records.length, 1);
  assert.notEqual(harness.Otp.records[0].otpHash, harness.sent[0].otp);
  assert.equal(harness.Otp.records[0].expiresAt.getTime() - harness.getNow(), OTP_LIFETIME_MS);

  await assert.rejects(
    harness.service.issue({
      email: 'person@example.com',
      userId: 'user-1',
      purpose: 'EMAIL_VERIFICATION',
      sendEmail: harness.sendEmail,
    }),
    (error) => error.code === 'OTP_RESEND_COOLDOWN' && error.retryAfterSeconds === 60,
  );
  harness.setNow(harness.getNow() + RESEND_COOLDOWN_MS + 1000);
  await harness.service.issue({
    email: 'person@example.com',
    userId: 'user-1',
    purpose: 'EMAIL_VERIFICATION',
    sendEmail: harness.sendEmail,
  });
  assert.equal(harness.sent.length, 2);
  await assert.rejects(
    harness.service.verify({
      email: 'person@example.com',
      purpose: 'EMAIL_VERIFICATION',
      otp: harness.sent[0].otp,
    }),
    (error) => error.code === 'OTP_INVALID',
  );
  await harness.service.verify({
    email: 'person@example.com',
    purpose: 'EMAIL_VERIFICATION',
    otp: harness.sent[1].otp,
  });
});

test('a correct email verification OTP is consumed and cannot be reused', async () => {
  const harness = createHarness();
  await harness.service.issue({
    email: 'person@example.com',
    userId: 'user-1',
    purpose: 'EMAIL_VERIFICATION',
    sendEmail: harness.sendEmail,
  });
  await harness.service.verify({
    email: 'person@example.com',
    purpose: 'EMAIL_VERIFICATION',
    otp: harness.sent[0].otp,
  });
  assert.equal(harness.Otp.records.length, 0);
  await assert.rejects(
    harness.service.verify({
      email: 'person@example.com',
      purpose: 'EMAIL_VERIFICATION',
      otp: harness.sent[0].otp,
    }),
    (error) => error.code === 'OTP_INVALID',
  );
});

test('incorrect OTP attempts are counted and the record is invalidated at the fifth failure', async () => {
  const harness = createHarness();
  await harness.service.issue({
    email: 'person@example.com',
    userId: 'user-1',
    purpose: 'EMAIL_VERIFICATION',
    sendEmail: harness.sendEmail,
  });
  const incorrectOtp = harness.sent[0].otp === '000000' ? '000001' : '000000';
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
    await assert.rejects(
      harness.service.verify({ email: 'person@example.com', purpose: 'EMAIL_VERIFICATION', otp: incorrectOtp }),
      (error) => error.code === 'OTP_INVALID',
    );
  }
  await assert.rejects(
    harness.service.verify({ email: 'person@example.com', purpose: 'EMAIL_VERIFICATION', otp: incorrectOtp }),
    (error) => error.code === 'OTP_MAX_ATTEMPTS',
  );
  assert.equal(harness.Otp.records.length, 0);
});

test('expired OTPs are removed and report an expiry error', async () => {
  const harness = createHarness();
  await harness.service.issue({
    email: 'person@example.com',
    userId: 'user-1',
    purpose: 'EMAIL_VERIFICATION',
    sendEmail: harness.sendEmail,
  });
  harness.setNow(harness.getNow() + OTP_LIFETIME_MS + 1);
  await assert.rejects(
    harness.service.verify({ email: 'person@example.com', purpose: 'EMAIL_VERIFICATION', otp: harness.sent[0].otp }),
    (error) => error.code === 'OTP_EXPIRED',
  );
  assert.equal(harness.Otp.records.length, 0);
});

test('password reset OTP becomes a single-use, expiring reset grant', async () => {
  const harness = createHarness();
  await harness.service.issue({
    email: 'person@example.com',
    userId: 'user-1',
    purpose: 'PASSWORD_RESET',
    sendEmail: harness.sendEmail,
  });
  const { resetToken } = await harness.service.verify({
    email: 'person@example.com',
    purpose: 'PASSWORD_RESET',
    otp: harness.sent[0].otp,
  });
  assert.equal(harness.Otp.records[0].otpHash, null);
  const grant = await harness.service.consumeResetToken({ email: 'person@example.com', resetToken });
  assert.equal(grant.userId, 'user-1');
  await assert.rejects(
    harness.service.consumeResetToken({ email: 'person@example.com', resetToken }),
    (error) => error.code === 'RESET_TOKEN_INVALID',
  );
});

test('password reset grants expire after verification', async () => {
  const harness = createHarness();
  await harness.service.issue({
    email: 'person@example.com',
    userId: 'user-1',
    purpose: 'PASSWORD_RESET',
    sendEmail: harness.sendEmail,
  });
  const { resetToken } = await harness.service.verify({
    email: 'person@example.com',
    purpose: 'PASSWORD_RESET',
    otp: harness.sent[0].otp,
  });
  harness.setNow(harness.getNow() + OTP_LIFETIME_MS + 1);
  await assert.rejects(
    harness.service.consumeResetToken({ email: 'person@example.com', resetToken }),
    (error) => error.code === 'RESET_TOKEN_INVALID',
  );
});
