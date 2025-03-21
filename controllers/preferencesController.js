const catchAsync = require('../utils/catchAsync');
const preferencesService = require('../services/preferencesService');
const userDto = require('../dtos/userDto');

// Update Preferences
exports.updatePreferences = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const preferences = req.body.preferences;

    // Call service to update preferences
    const updatedPreferences = await preferencesService.updatePreferences(userId, preferences);

    res.status(200).json({
        status: 'success',
        message: 'Preferences updated successfully.',
        data: { user: userDto(updatedPreferences) },
    });
});

// Get Preferences
exports.getPreferences = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    // Call service to fetch preferences
    const preferences = await preferencesService.getPreferences(userId);

    res.status(200).json({
        status: 'success',
        message: 'Preferences fetched successfully.',
        data: { user: userDto(preferences) },
    });
});