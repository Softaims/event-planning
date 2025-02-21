const { prisma } = require('../db');
const AppError = require('../utils/appError');

// Update User Preferences
exports.updatePreferences = async (userId, preferences) => {
    let userPreferences = await prisma.user.findUnique({ where: { userId } });

    if (userPreferences) {
        userPreferences = await prisma.user.update({
            where: { userId },
            data: { preferences },
        });
    } else {
        userPreferences = await prisma.user.create({
            data: { userId, preferences },
        });
    }

    return userPreferences;
};

// Get User Preferences
exports.getPreferences = async (userId) => {
    const preferences = await prisma.user.findUnique({ where: { userId } });

    if (!preferences) {
        throw new AppError('Preferences not found', 404);
    }

    return preferences;
};