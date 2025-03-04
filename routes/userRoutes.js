const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const { userValidations } = require("../validators/validation");
const validationMiddleware = require("../middlewares/validationMiddleware");
const parseJSONFields = require("../middlewares/parseJsonFields");
const upload = require("../utils/multer");

const router = express.Router();

/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Get the logged-in user's profile
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched user profile.
 *       401:
 *         description: Unauthorized.
 */
router.get("/me", authMiddleware.protect, userController.getMe);

/**
 * @swagger
 * /user/update-profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               dob:
 *                 type: string
 *                 format: date
 *               pronouns:
 *                 type: string
 *               lat:
 *                 type: number
 *               long:
 *                 type: number
 *               isProfilePublic:
 *                 type: boolean
 *               preferences:
 *                 type: string
 *                 description: JSON stringified user preferences.
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       400:
 *         description: Bad request, invalid fields provided.
 *       401:
 *         description: Unauthorized.
 */
router.patch(
  "/update-profile",
  authMiddleware.protect,
  upload.single("profileImage"),
  parseJSONFields(["preferences"]),
  userValidations.updateProfile,
  validationMiddleware.validate,
  userController.updateProfile
);

/**
 * @swagger
 * /user-profile/{userId}:
 *   get:
 *     summary: Get a user's profile
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to retrieve.
 *     responses:
 *       200:
 *         description: Successfully fetched user profile.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 */
router.get(
  "/user-profile/:userId",
  authMiddleware.protect,
  userController.getUserProfile
);

module.exports = router;
