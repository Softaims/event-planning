const express = require('express');
const authController = require('../controllers/authController');
const { authValidations } = require('../validators/validation');
const validationMiddleware = require('../middlewares/validationMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', authValidations.register, validationMiddleware.validate, authController.register);
router.post('/login', authValidations.login, validationMiddleware.validate, authController.login);
router.post('/forgot-password', authValidations.forgotPassword, validationMiddleware.validate, authController.forgotPassword);
router.patch('/reset-password/:otp', authValidations.resetPassword, validationMiddleware.validate, authController.resetPassword);
router.get('/logout', authMiddleware.protect, authController.logout);
router.post('/resend-verification-code', authController.resendVerificationCode);
router.get('/verify-phone/:otp', authController.verifyPhoneCode);

module.exports = router;
