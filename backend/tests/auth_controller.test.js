const assert = require('node:assert/strict');
const test = require('node:test');
const { phoneLoginCandidates } = require('../controllers/auth_controller');

test('phone login candidates match Indian numbers with common formatting and country prefixes', () => {
  const candidates = phoneLoginCandidates('+91 (904) 229-7499');

  assert.equal(candidates.some(({ phone }) => phone.test('9042297499')), true);
  assert.equal(candidates.some(({ phone }) => phone.test('+91 904 229 7499')), true);
  assert.equal(candidates.some(({ phone }) => phone.test('919042297499')), true);
});

test('phone login candidate validation rejects inputs outside the supported digit length', () => {
  assert.deepEqual(phoneLoginCandidates('12345'), []);
  assert.deepEqual(phoneLoginCandidates('1234567890123456'), []);
});
