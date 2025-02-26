const express = require("express");
const { getMe, updateProfile } = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const { userValidations } = require("../validators/validation");
const validationMiddleware = require("../middlewares/validationMiddleware");
const router = express.Router();
const upload = require("../utils/multer");
router.get("/me", authMiddleware.protect, getMe);
router.patch(
  "/update-profile",
  authMiddleware.protect,
  upload.single("profileImage"),
  userValidations.updateProfile,
  validationMiddleware.validate,
  updateProfile
);

module.exports = router;
