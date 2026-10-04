const express = require('express');
const router = express.Router();
const { pingServer } = require('../controllers/site_health');


router.get('/health', pingServer);




module.exports = router;