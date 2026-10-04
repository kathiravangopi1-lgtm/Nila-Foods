const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const hashPassword = (password) => {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) {
    throw new TypeError('Password must be a string no longer than 72 UTF-8 bytes.');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = (password, storedHash) => {
  if (typeof storedHash !== 'string' || !/^\$2[aby]\$\d\d\$/.test(storedHash)) {
    return false;
  }

  return bcrypt.compare(password, storedHash);
};

module.exports = { hashPassword, verifyPassword };
