// const { preferencesValidations } = require("../validators/validation");

const userDto = (user) => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    dob: user.dob.toISOString().split("T")[0],
    pronouns: user.pronouns,
    profileImage: user.profileImage,
    phoneVerified: user.phoneVerified,
    active: user.active,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isRegistrationComplete: user.isRegistrationComplete,
    lat: user.lat,
    long: user.long,
    location: user.location,
    preferences: user.preferences,
    isProfilePublic: user.isProfilePublic,
  };
};

module.exports = userDto;
