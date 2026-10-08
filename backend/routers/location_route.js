const express = require('express');
const {
  getCities,
  getCountries,
  getIndianPincode,
  getStates,
} = require('../controllers/location_controller');

const router = express.Router();

router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/cities', getCities);
router.get('/india/pincode/:pincode', getIndianPincode);

module.exports = router;
