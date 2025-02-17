const express = require('express');
const constantsController = require('../controllers/constantsController');

const router = express.Router();

// Route to get all available categories
router.get('/categories', constantsController.getCategories);

// Route to get a specific constant by category
router.get('/:category', constantsController.getConstantsByCategory);

module.exports = router;