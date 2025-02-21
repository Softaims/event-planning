const express = require('express');
const router = express.Router();

// Import your route files
const authRoutes = require('./authRoutes');
const constantsRoutes = require('./constantsRoutes');
const preferencesRoutes = require('./preferencesRoutes');
const userRoutes = require('./userRoutes');

// Use the route files
router.use('/auth', authRoutes);
router.use('/constants', constantsRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/user', userRoutes);

// Export the router
module.exports = router;
