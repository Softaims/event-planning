const express = require('express');
const router = express.Router();

// Import your route files
const authRoutes = require('./authRoutes');
const constantsRoutes = require('./constantsRoutes');
const preferencesRoutes = require('./preferencesRoutes');

// Use the route files
router.use('/auth', authRoutes);
router.use('/constants', constantsRoutes);
router.use('/preferences', preferencesRoutes);

// Export the router
module.exports = router;
