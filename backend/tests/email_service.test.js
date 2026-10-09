const assert = require('node:assert/strict');
const test = require('node:test');
const { createEmailService } = require('../services/email_service');

test('verification and password reset emails use a mocked Resend client', async () => {
  const sent = [];
  class MockResend {
    constructor(apiKey) {
      assert.equal(apiKey, 'test-resend-key');
      this.emails = {
        send: async (message) => {
          sent.push(message);
          return { data: { id: 'test-email-id' }, error: null };
        },
      };
    }
  }
  const email = createEmailService({
    ResendClient: MockResend,
    env: {
      RESEND_API_KEY: 'test-resend-key',
      RESEND_FROM_EMAIL: 'noreply@example.com',
      RESEND_FROM_NAME: 'Nila Foods',
    },
  });
  await email.sendEmailVerificationOTP('person@example.com', '123456');
  await email.sendPasswordResetOTP('person@example.com', '654321');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].subject, 'Verify your Nila Foods account');
  assert.equal(sent[0].from, 'Nila Foods <noreply@example.com>');
  assert.match(sent[0].text, /expires in 10 minutes/);
  assert.equal(sent[1].subject, 'Reset your Nila Foods password');
  assert.match(sent[1].text, /Do not share this code/);
});

test('email sending fails explicitly when Resend configuration is missing', async () => {
  const email = createEmailService({ env: {} });
  await assert.rejects(
    email.sendEmailVerificationOTP('person@example.com', '123456'),
    /Resend email configuration is missing/,
  );
});
