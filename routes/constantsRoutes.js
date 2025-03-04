const express = require("express");
const constantsController = require("../controllers/constantsController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Constants
 *   description: API for retrieving constants
 */

/**
 * @swagger
 * /constants/categories:
 *   get:
 *     summary: Get all available categories
 *     description: Returns a list of all available categories.
 *     tags: [Constants]
 *     responses:
 *       200:
 *         description: A list of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get("/categories", constantsController.getCategories);

/**
 * @swagger
 * /constants/{category}:
 *   get:
 *     summary: Get constants by category
 *     description: Retrieve constants for a specific category.
 *     tags: [Constants]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         description: The category name to retrieve constants for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of constants for the specified category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 category:
 *                   type: string
 *                 constants:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid category provided
 *       404:
 *         description: Category not found
 */
router.get("/:category", constantsController.getConstantsByCategory);

module.exports = router;
