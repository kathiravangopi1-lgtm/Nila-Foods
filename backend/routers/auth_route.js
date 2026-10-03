const express = require('express');
const {
  register,
  login,
  getCurrentUser,
} = require('../controllers/auth_controller');
const { requireAuth } = require('../middleware/require_auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getCurrentUser);

module.exports = router;
