const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const { prisma } = require("../db");
const { v4: uuidv4 } = require("uuid");

exports.getUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};

exports.updateUser = async (userId, updateData) => {
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
};

exports.updateProfileVisibility = async (userId, visibility) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { isProfilePublic: visibility },
  });
};

exports.calculateProfileCompletion = (user) => {
  const requiredPersonalFields = [
    "firstName",
    "lastName",
    "dob",
    "pronouns",
    "profileImage",
  ];

  const preferenceFields = [
    "preferences.bio",
    "preferences.major",
    "preferences.college",
    "preferences.graduatingYear",
    "preferences.musicGenre",
    "preferences.zodiacSign",
    "preferences.relationshipStatus",
  ];

  const arrayFields = [
    "preferences.collegeClubs",
    "preferences.favoriteShows",
    "preferences.favoriteArtists",
    "preferences.favoritePlacesToGo",
    "preferences.favoriteSportsTeams",
  ];

  const socialFields = [
    "preferences.socialLinks.facebook",
    "preferences.socialLinks.instagram",
    "preferences.socialLinks.snapchat",
    "preferences.socialLinks.linkedin",
    "preferences.socialLinks.twitter",
  ];

  // Number of required interest categories
  const requiredInterestCategoryCount = 3;

  let completedFields = 0;
  const totalFields =
    requiredPersonalFields.length +
    preferenceFields.length +
    arrayFields.length +
    socialFields.length +
    1; // +1 for all interest categories as a group

  // Check personal fields
  requiredPersonalFields.forEach((field) => {
    if (user[field] && user[field] !== "") completedFields++;
  });

  // Check preference fields (handling nested objects)
  preferenceFields.forEach((field) => {
    const keys = field.split(".");
    let value = user;

    // Navigate through nested objects
    for (const key of keys) {
      if (value && typeof value === "object") {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    if (value && value !== "") completedFields++;
  });

  // Check for at least 3 interest categories with content
  if (user.preferences && user.preferences.interests) {
    // Count categories with at least one interest
    let filledCategoriesCount = 0;

    // Loop through all categories in the interests object
    Object.keys(user.preferences.interests).forEach((category) => {
      if (
        Array.isArray(user.preferences.interests[category]) &&
        user.preferences.interests[category].length > 0
      ) {
        filledCategoriesCount++;
      }
    });

    // Count as complete only if there are at least 3 categories with content
    if (filledCategoriesCount >= requiredInterestCategoryCount) {
      completedFields++;
    }
  }

  // Check array fields (at least one item counts as completed)
  arrayFields.forEach((field) => {
    const keys = field.split(".");
    let value = user;

    // Navigate through nested objects
    for (const key of keys) {
      if (value && typeof value === "object") {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    if (Array.isArray(value) && value.length > 0) completedFields++;
  });

  // Check social links
  socialFields.forEach((field) => {
    const keys = field.split(".");
    let value = user;

    // Navigate through nested objects
    for (const key of keys) {
      if (value && typeof value === "object") {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    if (value && value !== "") completedFields++;
  });

  // Calculate percentage
  return Math.round((completedFields / totalFields) * 100);
};
