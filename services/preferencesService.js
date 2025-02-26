const { prisma } = require("../db");
const AppError = require("../utils/appError");

// Update User Preferences
exports.updatePreferences = async (id, preferences) => {
  let userPreferences = await prisma.user.findUnique({ where: { id } });

  if (userPreferences) {
    userPreferences = await prisma.user.update({
      where: { id },
      data: { preferences },
    });
  } else {
    userPreferences = await prisma.user.create({
      data: { id, preferences },
    });
  }

  return userPreferences;
};

// Get User Preferences
exports.getPreferences = async (id) => {
  const preferences = await prisma.user.findUnique({ where: { id } });

  if (!preferences) {
    throw new AppError("Preferences not found", 404);
  }

  return preferences;
};
