const assert = require('node:assert/strict');
const express = require('express');
const test = require('node:test');
const { authRequestLimiter, otpRequestLimiter, otpVerifyLimiter } = require('../middleware/auth_rate_limit');

const startServer = async (route, limiter) => {
  const app = express();
  app.post(route, limiter, (_req, res) => res.sendStatus(200));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    server,
    url: `http://127.0.0.1:${server.address().port}${route}`,
  };
};

test('auth, OTP request, and OTP verification middleware enforce endpoint limits', async (t) => {
  const cases = [
    { route: '/login', limiter: authRequestLimiter, allowed: 10 },
    { route: '/otp-request', limiter: otpRequestLimiter, allowed: 10 },
    { route: '/otp-verify', limiter: otpVerifyLimiter, allowed: 20 },
  ];
  const servers = await Promise.all(cases.map(({ route, limiter }) => startServer(route, limiter)));
  t.after(async () => Promise.all(servers.map(({ server }) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }))));

  for (let index = 0; index < cases.length; index += 1) {
    const { allowed } = cases[index];
    const { url } = servers[index];
    for (let request = 0; request < allowed; request += 1) {
      const response = await fetch(url, { method: 'POST' });
      assert.equal(response.status, 200);
    }
    const limited = await fetch(url, { method: 'POST' });
    assert.equal(limited.status, 429);
    const body = await limited.json();
    assert.equal(body.code, 'AUTH_RATE_LIMITED');
  }
});
