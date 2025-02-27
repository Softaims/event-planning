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
    "preferences.socialLinks.Facebook",
    "preferences.socialLinks.Instagram",
  ];

  let completedFields = 0;
  const totalFields =
    requiredPersonalFields.length +
    preferenceFields.length +
    arrayFields.length +
    socialFields.length +
    1; 

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

  // Special handling for interests object
  if (
    user.preferences &&
    user.preferences.interests &&
    typeof user.preferences.interests === "object"
  ) {
    // Check if any category has at least one interest
    const hasInterests = Object.values(user.preferences.interests).some(
      (category) => Array.isArray(category) && category.length > 0
    );

    if (hasInterests) completedFields++;
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




