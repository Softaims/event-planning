const express = require("express");
const authController = require("../controllers/authController");
const { authValidations } = require("../validators/validation");
const validationMiddleware = require("../middlewares/validationMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../utils/multer");

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               pronouns:
 *                 type: string
 *               lat:
 *                 type: number
 *               long:
 *                 type: number
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Registration successful.
 *       400:
 *         description: Bad request.
 */
router.post(
  "/register",
  upload.single("profileImage"),
  authValidations.register,
  validationMiddleware.validate,
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful.
 *       401:
 *         description: Unauthorized, incorrect credentials.
 */
router.post(
  "/login",
  authValidations.login,
  validationMiddleware.validate,
  authController.login
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset via OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully.
 *       401:
 *         description: No user found with this phone number.
 */
router.post(
  "/forgot-password",
  authValidations.forgotPassword,
  validationMiddleware.validate,
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       401:
 *         description: Invalid user ID or expired OTP.
 */
router.post(
  "/reset-password",
  authValidations.resetPassword,
  validationMiddleware.validate,
  authController.resetPassword
);

/**
 * @swagger
 * /auth/verify-password-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully.
 *       401:
 *         description: Invalid or expired OTP.
 */
router.post("/verify-password-otp", authController.verifyPasswordOtp);

/**
 * @swagger
 * /auth/resend-password-otp:
 *   post:
 *     summary: Resend OTP for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully.
 *       401:
 *         description: No user found or OTP request limit exceeded.
 */
router.post("/resend-password-otp", authController.resendPasswordOtp);

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/logout", authMiddleware.protect, authController.logout);

/**
 * @swagger
 * /auth/resend-verification-code:
 *   post:
 *     summary: Resend phone verification code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code resent successfully.
 *       401:
 *         description: User not found or already verified.
 */
router.post("/resend-verification-code", authController.resendVerificationCode);

/**
 * @swagger
 * /auth/verify-phone:
 *   post:
 *     summary: Verify phone number using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully.
 *       401:
 *         description: Invalid or expired OTP.
 */
router.post("/verify-phone", authController.verifyPhoneCode);

module.exports = router;
