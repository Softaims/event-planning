const { prisma } = require('../db');
const AppError = require('../utils/appError');

// Update User Preferences
exports.updatePreferences = async (userId, preferences) => {
    let userPreferences = await prisma.userPreferences.findUnique({ where: { userId } });

    if (userPreferences) {
        userPreferences = await prisma.userPreferences.update({
            where: { userId },
            data: { preferences },
        });
    } else {
        userPreferences = await prisma.userPreferences.create({
            data: { userId, preferences },
        });
    }

    return userPreferences;
};

// Get User Preferences
exports.getPreferences = async (userId) => {
    const preferences = await prisma.userPreferences.findUnique({ where: { userId } });

    if (!preferences) {
        throw new AppError('Preferences not found', 404);
    }

    return preferences;
};