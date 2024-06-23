const express = require('express');
const { getProfile, updateProfile, changePassword } = require('../controllers/profileController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
