const express = require('express');
const router = express.Router();

// Import your route files
const authRoutes = require('./authRoutes');
const constantsRoutes = require('./constantsRoutes');
const preferencesRoutes = require('./preferencesRoutes');
const userRoutes = require('./userRoutes');
const eventsRoutes = require("./eventsRoutes");

// Use the route files
router.use('/auth', authRoutes);
router.use('/constants', constantsRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/user', userRoutes);
router.use("/events", eventsRoutes);

// Export the router
module.exports = router;
