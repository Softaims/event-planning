const express = require("express");
const authController = require("../controllers/authController");
const { authValidations } = require("../validators/validation");
const validationMiddleware = require("../middlewares/validationMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../utils/multer");
const router = express.Router();

router.post(
  "/register",
  upload.single("profileImage"),
  authValidations.register,
  validationMiddleware.validate,
  authController.register
);

router.post(
  "/login",
  authValidations.login,
  validationMiddleware.validate,
  authController.login
);

router.post(
  "/forgot-password",
  authValidations.forgotPassword,
  validationMiddleware.validate,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  authValidations.resetPassword,
  validationMiddleware.validate,
  authController.resetPassword
);

router.post("/verify-password-otp", authController.verifyPasswordOtp);

router.post("/resend-password-otp", authController.resendPasswordOtp);

router.get("/logout", authMiddleware.protect, authController.logout);

router.post("/resend-verification-code", authController.resendVerificationCode);

router.post("/verify-phone", authController.verifyPhoneCode);

module.exports = router;
