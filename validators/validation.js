const { check } = require('express-validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const constants = require("../constants");
const emailValidator = require('email-validator');

const isValidEntry = (value, list) => {
    return list.map(item => item.toLowerCase()).includes(value.toLowerCase());
};


// Auth Validations
const authValidations = {
    register: [
        check('email')
            .isEmail().withMessage('Please provide a valid email address.')
            .bail()
            .custom(async (email) => {
                // 1️⃣ Check if the email is valid using email-validator
                if (!emailValidator.validate(email)) {
                    throw new Error('Invalid email format.');
                }
                return true;
            }),
        check('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long.')
            .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
            .matches(/[0-9]/).withMessage('Password must contain at least one number.')
            .matches(/[\W_]/).withMessage('Password must contain at least one special character.'),

        check('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match.');
                }
                return true;
            }),

        check('firstName')
            .not().isEmpty().withMessage('First Name is required.')
            .trim(),

        check('lastName')
            .not().isEmpty().withMessage('Last Name is required.')
            .trim(),

        check('phoneNumber')
            .not().isEmpty().withMessage('Phone number is required.')
            .custom((value) => {
                const phoneNumber = parsePhoneNumberFromString(value);
                if (!phoneNumber || !phoneNumber.isValid()) {
                    throw new Error('Invalid phone number format.');
                }

                // Restrict to Pakistan (+92), India (+91), USA (+1)
                const allowedCountries = ['PK', 'IN', 'US'];
                if (!allowedCountries.includes(phoneNumber.country)) {
                    throw new Error('Only phone numbers from Pakistan (+92), India (+91), and USA (+1) are allowed.');
                }

                return true;
            }),

        check('dob')
            .not().isEmpty().withMessage('Date of Birth is required.'),

        check('pronouns')
            .not().isEmpty().withMessage('Pronouns required.')
            .isIn(['he_him', 'she_her', 'they_them', 'other']).withMessage('Invalid pronoun selection.'),

        check('profileImage')
            .custom((_, { req }) => {
                if (!req.file) {
                    throw new Error('Profile image is required.');
                }

                const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                if (!allowedMimeTypes.includes(req.file.mimetype)) {
                    throw new Error('Profile image must be a valid image file (JPEG, PNG, JPG).');
                }
                return true;
            }),
    ],
    login: [
        check('phoneNumber')
            .not().isEmpty().withMessage('Phone Number is required.'),
        check('password').not().isEmpty().withMessage('Password is required.'),
    ],
    forgotPassword: [
        check('phoneNumber').not().isEmpty().withMessage('Phone Number is required.'),
    ],
    resetPassword: [
        check('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long.')
            .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
            .matches(/[0-9]/).withMessage('Password must contain at least one number.')
            .matches(/[\W_]/).withMessage('Password must contain at least one special character.'),
        check('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match');
                }
                return true;
            }),
    ],
};
// Add other validations if needed
const userValidations = {
    updateProfile: [
        check('name').not().isEmpty().withMessage('Name is required.'),
        // Other checks for profile update can be added here
    ],
};

const preferencesValidations = [
    check('preferences')
        .exists()
        .withMessage('Preferences JSON is required.')
        .custom(value => {
            if (typeof value !== 'object' || value === null) {
                throw new Error('Preferences must be a valid JSON object.');
            }

            // Ensure required keys exist even if empty
            const requiredKeys = [
                "bio", "major", "college", "interests",
                "musicGenre", "zodiacSign", "socialLinks",
                "collegeClubs", "favoriteShows", "graduatingYear",
                "favoriteArtists", "favoritePlacesToGo", "relationshipStatus",
                "favoriteSportsTeams"
            ];

            requiredKeys.forEach(key => {
                if (!Object.prototype.hasOwnProperty.call(value, key)) {
                    throw new Error(`Missing required preference field: ${key}`);
                }
            });

            return true;
        }),

    check('preferences.musicGenre')
        .custom(value => {
            if (!isValidEntry(value, constants.musicGenres)) {
                throw new Error('Invalid genre selected.');
            }
            return true;
        }),



    check('preferences.interests')
        .custom(value => {
            if (typeof value !== 'object' || value === null) {
                throw new Error('Interests must be a valid JSON object.');
            }

            let totalInterests = 0; // Counter for total selected interests

            Object.keys(value).forEach(category => {
                if (!constants.interests.hasOwnProperty(category)) {
                    throw new Error(`Invalid interest category: ${category}`);
                }

                const interestsArray = value[category];

                if (!Array.isArray(interestsArray)) {
                    throw new Error(`Interests in category '${category}' must be an array.`);
                }

                totalInterests += interestsArray.length; // Count total interests

                interestsArray.forEach(interest => {
                    if (!constants.interests[category].includes(interest)) {
                        throw new Error(`Invalid interest '${interest}' in category '${category}'`);
                    }
                });
            });

            // ✅ Ensure total interests across all categories is **maximum 3**
            if (totalInterests > 3) {
                throw new Error(`You can select a maximum of 3 interests across all categories.`);
            }

            return true;
        }),


    check('preferences.zodiacSign')
        .custom(value => {
            if (!isValidEntry(value, constants.zodiacSigns)) {
                throw new Error('Invalid Zodiac Sign selected.');
            }
            return true;
        }),

    check('preferences.college')
        .custom(value => {
            if (!isValidEntry(value, constants.colleges)) {
                throw new Error('Invalid college selected.');
            }
            return true;
        }),


    check('preferences.major')
        .custom(value => {
            if (!isValidEntry(value, constants.majors)) {
                throw new Error('Invalid major selected.');
            }
            return true;
        }),

    check('preferences.graduatingYear')
        .isInt({ min: 1970, max: new Date().getFullYear() + 10 })
        .withMessage(`Graduating year must be between 1970 and ${new Date().getFullYear() + 10}`),

    check('preferences.collegeClubs')
        .isArray()
        .custom(value => {
            value.forEach(club => {
                if (!isValidEntry(club, constants.collegeClubs)) {
                    throw new Error(`Invalid college club '${club}' selected.`);
                }
            });
            return true;
        }),


    check('preferences.relationshipStatus')
        .isString().withMessage('Relationship status must be a string.')
        .custom(value => {
            if (!isValidEntry(value, constants.relationshipStatus)) {
                throw new Error(`Invalid relationship status: ${value}`);
            }
            return true;
        }),

    // 🎶 Favorite Artists (Array of values)
    check('preferences.favoriteArtists')
        .isArray()
        .custom(value => {
            value.forEach(artist => {
                if (!isValidEntry(artist, constants.artists)) {
                    throw new Error(`Invalid favorite artist '${artist}' selected.`);
                }
            });
            return true;
        }),


    // 📺 Favorite TV Shows (Array of values)
    check('preferences.favoriteShows')
        .isArray()
        .custom(value => {
            value.forEach(show => {
                if (!isValidEntry(show, constants.tvShows)) {
                    throw new Error(`Invalid favorite show '${show}' selected.`);
                }
            });
            return true;
        }),


    // ⚽ **Flattened Favorite Sports Teams (Array)**
    check('preferences.favoriteSportsTeams')
        .isArray()
        .custom(value => {
            value.forEach(team => {
                if (!isValidEntry(team, constants.sportsTeamsList)) { // Single list of all sports teams
                    throw new Error(`Invalid sports team '${team}' selected.`);
                }
            });
            return true;
        }),

    // 🌍 Favorite Places To Go (Array of values)
    check('preferences.favoritePlacesToGo')
        .isArray()
        .custom(value => {
            value.forEach(place => {
                if (!isValidEntry(place, constants.favoritePlacesToGo)) {
                    throw new Error(`Invalid favorite place '${place}' selected.`);
                }
            });
            return true;
        }),

    check('preferences.socialLinks')
        .custom(value => {
            const allowedPlatforms = ['Facebook', 'LinkedIn', 'Instagram', 'Twitter', 'Snapchat'];
            Object.keys(value).forEach(platform => {
                if (!allowedPlatforms.includes(platform)) {
                    throw new Error(`Invalid social media platform: ${platform}`);
                }
                if (!value[platform].startsWith('http')) {
                    throw new Error(`Invalid URL format for ${platform}.`);
                }
            });
            return true;
        }),


    check('preferences.bio')
        .isLength({ max: 160 })
        .withMessage('Bio cannot exceed 160 characters.')
];

module.exports = {
    authValidations,
    userValidations,
    preferencesValidations
};
