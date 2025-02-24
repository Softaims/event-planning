const express = require('express');
const router = express.Router();
const preferencesController = require('../controllers/preferencesController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { preferencesValidations } = require('../validators/validation');
const {normalizePreferences} = require('../middlewares/normalizePreferencesMiddleware');

router.post('/', 
    authMiddleware.protect, 
    normalizePreferences,
    preferencesValidations, 
    validationMiddleware.validate, 
    preferencesController.updatePreferences
);

// Get Preferences
router.get('/', authMiddleware.protect, preferencesController.getPreferences);

module.exports = router;