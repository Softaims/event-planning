const express = require("express");
const router = express.Router();
const preferencesController = require("../controllers/preferencesController");
const authMiddleware = require("../middlewares/authMiddleware");
const validationMiddleware = require("../middlewares/validationMiddleware");
const { preferencesValidations } = require("../validators/validation");
const {
  normalizePreferences,
} = require("../middlewares/normalizePreferencesMiddleware");

/**
 * @swagger
 * tags:
 *   name: Preferences
 *   description: API for user preferences management
 */

/**
 * @swagger
 * /preferences:
 *   post:
 *     summary: Update user preferences
 *     tags: [Preferences]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: object
 *                 description: JSON object containing user preferences.
 *     responses:
 *       200:
 *         description: Preferences updated successfully.
 *       400:
 *         description: Bad request, validation error.
 *       401:
 *         description: Unauthorized.
 */
router.post(
  "/",
  authMiddleware.protect,
  normalizePreferences,
  preferencesValidations,
  validationMiddleware.validate,
  preferencesController.updatePreferences
);

/**
 * @swagger
 * /preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Preferences]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/", authMiddleware.protect, preferencesController.getPreferences);

module.exports = router;
