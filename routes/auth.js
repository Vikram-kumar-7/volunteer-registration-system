const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { forwardAuthenticated } = require('../middleware/auth');

// Login Route
router.get('/login', forwardAuthenticated, authController.getLogin);
router.post('/login', authController.postLogin);

// Registration Route
router.get('/register', forwardAuthenticated, authController.getRegister);
router.post('/register', authController.postRegister);

// Logout Route
router.get('/logout', authController.logout);

// Forgot Password Route
router.get('/forgot-password', forwardAuthenticated, authController.getForgot);
router.post('/forgot-password', authController.postForgot);

// Reset Password Route
router.get('/reset/:token', forwardAuthenticated, authController.getReset);
router.post('/reset/:token', authController.postReset);

module.exports = router;
