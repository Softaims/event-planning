const { check } = require("express-validator");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const constants = require("../constants");
const emailValidator = require("email-validator");

const isValidEntry = (value, list) => {
  if (!Array.isArray(list)) return false; // Ensure list is an array
  if (!value || typeof value !== "string" || value.trim() === "") return true; // Allow empty string or null as valid input

  return list
    .map((item) => item.toLowerCase().trim())
    .includes(value.toLowerCase().trim());
};

// Auth Validations
const authValidations = {
  register: [
    check("email")
      .isEmail()
      .withMessage("Please provide a valid email address.")
      .bail()
      .custom(async (email) => {
        // 1️⃣ Check if the email is valid using email-validator
        if (!emailValidator.validate(email)) {
          throw new Error("Invalid email format.");
        }
        return true;
      }),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long.")
      .matches(/[a-z]/)
      .withMessage("Password must contain at least one lowercase letter.")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter.")
      .matches(/[0-9]/)
      .withMessage("Password must contain at least one number.")
      .matches(/[\W_]/)
      .withMessage("Password must contain at least one special character."),

    check("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }
      return true;
    }),

    check("firstName")
      .not()
      .isEmpty()
      .withMessage("First Name is required.")
      .trim(),

    check("lastName")
      .not()
      .isEmpty()
      .withMessage("Last Name is required.")
      .trim(),

    check("phoneNumber")
      .not()
      .isEmpty()
      .withMessage("Phone number is required.")
      .custom((value) => {
        const phoneNumber = parsePhoneNumberFromString(value);
        if (!phoneNumber || !phoneNumber.isValid()) {
          throw new Error("Invalid phone number format.");
        }

        // Restrict to Pakistan (+92), India (+91), USA (+1)
        const allowedCountries = ["PK", "IN", "US"];
        if (!allowedCountries.includes(phoneNumber.country)) {
          throw new Error(
            "Only phone numbers from Pakistan (+92), India (+91), and USA (+1) are allowed."
          );
        }

        return true;
      }),

    check("dob").not().isEmpty().withMessage("Date of Birth is required."),

    check("pronouns")
      .not()
      .isEmpty()
      .withMessage("Pronouns required.")
      .isIn(["he_him", "she_her", "they_them", "other"])
      .withMessage("Invalid pronoun selection."),

    check("profileImage").custom((_, { req }) => {
      if (!req.file) {
        throw new Error("Profile image is required.");
      }

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        throw new Error(
          "Profile image must be a valid image file (JPEG, PNG, JPG)."
        );
      }
      return true;
    }),

    check("lat")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude value."),

    check("long")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude value."),
  ],
  login: [
    check("phoneNumber")
      .not()
      .isEmpty()
      .withMessage("Phone Number is required."),
    check("password").not().isEmpty().withMessage("Password is required."),
  ],
  forgotPassword: [
    check("phoneNumber")
      .not()
      .isEmpty()
      .withMessage("Phone Number is required."),
  ],
  resetPassword: [
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long.")
      .matches(/[a-z]/)
      .withMessage("Password must contain at least one lowercase letter.")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter.")
      .matches(/[0-9]/)
      .withMessage("Password must contain at least one number.")
      .matches(/[\W_]/)
      .withMessage("Password must contain at least one special character."),
    check("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  ],
};
// Add other validations if needed
const userValidations = {
  updateProfile: [
    check("firstName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("First Name cannot be empty."),
    check("lastName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Last Name cannot be empty."),
    check("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email address.")
      .bail()
      .custom(async (email) => {
        // 1️⃣ Check if the email is valid using email-validator
        if (!emailValidator.validate(email)) {
          throw new Error("Invalid email format.");
        }
        return true;
      }),
    check("dob")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Date of Birth is required."),
    check("pronouns")
      .optional()
      .isIn(["he_him", "she_her", "they_them", "other"])
      .withMessage("Invalid pronoun selection."),
    check("lat")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude value."),
    check("long")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude value."),
    check("profileImage")
      .optional()
      .custom((_, { req }) => {
        if (!req.file) {
          throw new Error("Profile image is required.");
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          throw new Error(
            "Profile image must be a valid image file (JPEG, PNG, JPG)."
          );
        }
        return true;
      }),
  ],
};

const preferencesValidations = [
  check("preferences")
    .exists()
    .withMessage("Preferences JSON is required.")
    .custom((value) => {
      if (typeof value !== "object" || value === null) {
        throw new Error("Preferences must be a valid JSON object.");
      }

      // Required preference fields
      const requiredKeys = [
        "bio",
        "major",
        "college",
        "interests",
        "musicGenre",
        "zodiacSign",
        "socialLinks",
        "collegeClubs",
        "favoriteShows",
        "graduatingYear",
        "favoriteArtists",
        "favoritePlacesToGo",
        "relationshipStatus",
        "favoriteSportsTeams",
      ];

      const missingKeys = [];

      requiredKeys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          missingKeys.push(key); // 🔴 Only add missing keys (don't check empty values)
        }
      });

      if (missingKeys.length > 0) {
        console.error(
          `🚨 Missing preference fields: ${missingKeys.join(", ")}`
        );
        throw new Error(`Missing preference fields: ${missingKeys.join(", ")}`);
      }

      return true;
    }),

  check("preferences.musicGenre")
    .optional()
    .custom((value) => {
      if (!isValidEntry(value, constants.musicGenres)) {
        throw new Error("Invalid genre selected.");
      }
      return true;
    }),

  check("preferences.interests")
    .optional()
    .custom((value) => {
      if (!value || typeof value !== "object") {
        throw new Error("Interests must be a valid JSON object.");
      }

      let totalInterests = 0; // Counter for total selected interests

      Object.keys(value).forEach((category) => {
        if (!constants.interests.hasOwnProperty(category)) {
          throw new Error(`Invalid interest category: ${category}`);
        }

        const interestsArray = Array.isArray(value[category])
          ? value[category]
          : []; // Ensure it's always an array

        totalInterests += interestsArray.length; // Count total interests

        interestsArray.forEach((interest) => {
          if (!constants.interests[category].includes(interest)) {
            throw new Error(
              `Invalid interest '${interest}' in category '${category}'`
            );
          }
        });
      });

      // ✅ Ensure total interests across all categories is **maximum 3**
      if (totalInterests > 3) {
        throw new Error(
          `You can select a maximum of 3 interests across all categories.`
        );
      }

      return true;
    }),
  check("preferences.zodiacSign")
    .optional()
    .custom((value) => {
      if (!isValidEntry(value, constants.zodiacSigns)) {
        throw new Error("Invalid Zodiac Sign selected.");
      }
      return true;
    }),

  check("preferences.college")
    .optional()
    .custom((value) => {
      if (!isValidEntry(value, constants.colleges)) {
        throw new Error("Invalid college selected.");
      }
      return true;
    }),

  check("preferences.major")
    .optional()
    .custom((value) => {
      if (!isValidEntry(value, constants.majors)) {
        throw new Error("Invalid major selected.");
      }
      return true;
    }),

  check("preferences.graduatingYear")
    .optional()
    .custom((value) => {
      if (value !== null && (typeof value !== "number" || isNaN(value))) {
        throw new Error("Graduating year must be a valid number or null.");
      }

      if (
        value !== null &&
        (value < 1970 || value > new Date().getFullYear() + 10)
      ) {
        throw new Error(
          `Graduating year must be between 1970 and ${
            new Date().getFullYear() + 10
          }`
        );
      }

      return true;
    }),

  check("preferences.collegeClubs")
    .optional()
    .isArray()
    .custom((value) => {
      value.forEach((club) => {
        if (!isValidEntry(club, constants.collegeClubs)) {
          throw new Error(`Invalid college club '${club}' selected.`);
        }
      });
      return true;
    }),

  check("preferences.relationshipStatus")
    .optional()
    .isString()
    .withMessage("Relationship status must be a string.")
    .custom((value) => {
      if (!isValidEntry(value, constants.relationshipStatus)) {
        throw new Error(`Invalid relationship status: ${value}`);
      }
      return true;
    }),

  // 🎶 Favorite Artists (Array of values)
  check("preferences.favoriteArtists")
    .optional()
    .isArray()
    .custom((value) => {
      value.forEach((artist) => {
        if (!isValidEntry(artist, constants.artists)) {
          throw new Error(`Invalid favorite artist '${artist}' selected.`);
        }
      });
      return true;
    }),

  // 📺 Favorite TV Shows (Array of values)
  check("preferences.favoriteShows")
    .optional()
    .isArray()
    .custom((value) => {
      value.forEach((show) => {
        if (!isValidEntry(show, constants.tvShows)) {
          throw new Error(`Invalid favorite show '${show}' selected.`);
        }
      });
      return true;
    }),

  // 🌍 Favorite Places To Go (Array of values)
  check("preferences.favoriteSportsTeams")
    .optional()
    .isArray()
    .withMessage("Favorite sports teams must be an array.")
    .custom((value) => {
      value.forEach((team) => {
        if (!isValidEntry(team, constants.sportsTeams)) {
          throw new Error(`Invalid sports team '${team}' selected.`);
        }
      });
      return true;
    }),

  // 🌍 Favorite Places To Go (Array of values)
  check("preferences.favoritePlacesToGo")
    .optional()
    .isArray()
    .custom((value) => {
      value.forEach((place) => {
        if (!isValidEntry(place, constants.favoritePlacesToGo)) {
          throw new Error(`Invalid favorite place '${place}' selected.`);
        }
      });
      return true;
    }),

  check("preferences.socialLinks")
    .optional()
    .custom((value) => {
      const allowedPlatforms = [
        "Facebook",
        "LinkedIn",
        "Instagram",
        "Twitter",
        "Snapchat",
      ];
      Object.keys(value).forEach((platform) => {
        if (!allowedPlatforms.includes(platform)) {
          throw new Error(`Invalid social media platform: ${platform}`);
        }
        if (!value[platform].startsWith("http")) {
          throw new Error(`Invalid URL format for ${platform}.`);
        }
      });
      return true;
    }),

  check("preferences.bio")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Bio cannot exceed 160 characters."),
];

const eventValidations = {
  createEvent: [
    check("name")
      .not()
      .isEmpty()
      .withMessage("Event name is required.")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Event name must be between 3 and 100 characters."),

    check("description")
      .not()
      .isEmpty()
      .withMessage("Description is required.")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be between 10 and 1000 characters."),

    check("dateTime")
      .not()
      .isEmpty()
      .withMessage("Event date and time is required.")
      .isISO8601()
      .withMessage("Invalid event date and time format.")
      .custom((value) => {
        const eventDate = new Date(value);
        const now = new Date();
        if (eventDate < now) {
          throw new Error("Event date and time cannot be in the past.");
        }
        return true;
      }),

    check("image").custom((_, { req }) => {
      if (!req.file) {
        throw new Error("Event Image is required.");
      }

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        throw new Error(
          "Event image must be a valid image file (JPEG, PNG, JPG)."
        );
      }
      return true;
    }),


    check("location")
      .not()
      .isEmpty()
      .withMessage("Location is required.")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Location must be between 3 and 200 characters."),

    check("ageMin")
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage("Minimum age must be between 0 and 100.")
      .custom((value, { req }) => {
        if (req.body.ageMax && value > req.body.ageMax) {
          throw new Error("Minimum age cannot be greater than maximum age.");
        }
        return true;
      }),

    check("ageMax")
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage("Maximum age must be between 0 and 100."),

    check("ticketUrls")
      .optional()
      .isArray()
      .withMessage("Ticket URLs must be an array.")
      .custom((value) => {
        if (value) {
          value.forEach((url) => {
            if (!url.match(/^https?:\/\/.+/)) {
              throw new Error("Invalid ticket URL format.");
            }
          });
        }
        return true;
      }),
    ...preferencesValidations,
  ],

  updateEvent: [
    check("name")
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Event name must be between 3 and 100 characters."),

    check("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be between 10 and 1000 characters."),

    check("dateTime")
      .optional()
      .isISO8601()
      .withMessage("Invalid event date and time format.")
      .custom((value) => {
        const eventDate = new Date(value);
        const now = new Date();
        if (eventDate < now) {
          throw new Error("Event date and time cannot be in the past.");
        }
        return true;
      }),

    check("image")
      .optional()
      .custom((_, { req }) => {
        if (!req.file) {
          throw new Error("Event Image is required.");
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          throw new Error(
            "Event image must be a valid image file (JPEG, PNG, JPG)."
          );
        }
        return true;
      }),


    check("location")
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Location must be between 3 and 200 characters."),

    check("ageMin")
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage("Minimum age must be between 0 and 100.")
      .custom((value, { req }) => {
        const maxAge = req.body.ageMax || (req.event && req.event.ageMax);
        if (maxAge && value > maxAge) {
          throw new Error("Minimum age cannot be greater than maximum age.");
        }
        return true;
      }),

    check("ageMax")
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage("Maximum age must be between 0 and 100."),

    check("ticketUrls")
      .optional()
      .isArray()
      .withMessage("Ticket URLs must be an array.")
      .custom((value) => {
        if (value) {
          value.forEach((url) => {
            if (!url.match(/^https?:\/\/.+/)) {
              throw new Error("Invalid ticket URL format.");
            }
          });
        }
        return true;
      }),
    ...preferencesValidations,
  ],
};

module.exports = {
  authValidations,
  userValidations,
  preferencesValidations,
  eventValidations,
};
