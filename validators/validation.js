const { check, body, validationResult } = require('express-validator');
const constants = require("../constants");

const dns = require('dns');

const isValidEntry = (value, list) => {
    return list.map(item => item.toLowerCase()).includes(value.toLowerCase());
};

const emailDomainIsValid = (email) => {
    return new Promise((resolve, reject) => {
        const domain = email.split('@')[1];
        dns.resolveMx(domain, (err, addresses) => {
            if (err) reject(err);
            resolve(addresses && addresses.length > 0);
        });
    });
};

// Auth Validations
const authValidations = {
    register: [
        check('email')
            .isEmail().withMessage('Please provide a valid email address.')
            .bail()
            .custom(async (email) => {
                const isValidDomain = await emailDomainIsValid(email);
                if (!isValidDomain) {
                    throw new Error('Email domain has no MX records, thus cannot receive emails.');
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
            .matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number format. Must be 10-15 digits with an optional leading "+".'),

        check('dob')
            .not().isEmpty().withMessage('Date of Birth is required.')
            .isISO8601().withMessage('Invalid date format (YYYY-MM-DD required).'),

        check('pronouns')
            .optional()
            .isIn(['he_him', 'she_her', 'they_them', 'other']).withMessage('Invalid pronoun selection.'),

        check('profileImage')
            .optional()
            .isURL().withMessage('Profile image must be a valid URL.')
    ],
    login: [
        check('phoneNumber').not().isEmpty().withMessage('Phone Number is required.'),
        check('password').not().isEmpty().withMessage('Password is required.'),
    ],
    forgotPassword: [
        check('phoneNumber').isEmail().withMessage('Please provide a valid phone number.'),
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
            if (typeof value !== 'object') {
                throw new Error('Preferences must be a valid JSON object.');
            }
            return true;
        }),

    check('preferences.musicGenre')
        .optional()
        .custom(value => {
            if (!isValidEntry(value, constants.musicGenres)) {
                throw new Error('Invalid genre selected.');
            }
            return true;
        }),


    check('preferences.interests')
        .optional()
        .custom(value => {
            if (typeof value !== 'object' || value === null) {
                throw new Error('Interests must be a valid JSON object.');
            }

            // Ensure all categories exist in constants and each contains an array
            Object.keys(value).forEach(category => {

                if (!constants.interests.hasOwnProperty(category)) {
                    throw new Error(`Invalid interest category: ${category}`);
                }

                const interestsArray = value[category];

                if (!Array.isArray(interestsArray)) {
                    throw new Error(`Interests in category '${category}' must be an array.`);
                }

                // Validate each interest inside the category
                interestsArray.forEach(interest => {
                    if (!constants.interests[category].includes(interest)) {
                        throw new Error(`Invalid interest '${interest}' in category '${category}'`);
                    }
                });
            });

            return true;
        }),

    check('preferences.zodiacSign')
        .optional()
        .custom(value => {
            if (!isValidEntry(value, constants.zodiacSigns)) {
                throw new Error('Invalid Zodiac Sign selected.');
            }
            return true;
        }),

    check('preferences.college')
        .optional()
        .custom(value => {
            if (!isValidEntry(value, constants.colleges)) {
                throw new Error('Invalid college selected.');
            }
            return true;
        }),


    check('preferences.major')
        .optional()
        .custom(value => {
            if (!isValidEntry(value, constants.majors)) {
                throw new Error('Invalid major selected.');
            }
            return true;
        }),

    check('preferences.graduatingYear')
        .optional()
        .isInt({ min: 1970, max: new Date().getFullYear() + 10 })
        .withMessage(`Graduating year must be between 1970 and ${new Date().getFullYear() + 10}`),

    check('preferences.collegeClubs')
        .optional()
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
        .optional()
        .isString().withMessage('Relationship status must be a string.')
        .custom(value => {
            if (!isValidEntry(value, constants.relationshipStatus)) {
                throw new Error(`Invalid relationship status: ${value}`);
            }
            return true;
        }),

    // 🎶 Favorite Artists (Array of values)
    check('preferences.favoriteArtists')
        .optional()
        .isArray()
        .custom(value => {
            value.forEach(artist => {
                if (!isValidEntry(artist, constants.musicians)) {
                    throw new Error(`Invalid favorite artist '${artist}' selected.`);
                }
            });
            return true;
        }),


    // 📺 Favorite TV Shows (Array of values)
    check('preferences.favoriteShows')
        .optional()
        .isArray()
        .custom(value => {
            value.forEach(show => {
                if (!isValidEntry(show, constants.tvShows)) {
                    throw new Error(`Invalid favorite show '${show}' selected.`);
                }
            });
            return true;
        }),


    // ⚽ Favorite Sports Teams (Multiple categories)
    check('preferences.favoriteSportsTeams')
        .optional()
        .custom(value => {
            Object.keys(value).forEach(category => {
                if (!constants.sportsTeams.hasOwnProperty(category)) {
                    throw new Error(`Invalid sports category: ${category}`);
                }
                value[category].forEach(team => {
                    if (!isValidEntry(team, constants.sportsTeams[category])) {
                        throw new Error(`Invalid team '${team}' in category '${category}'`);
                    }
                });
            });
            return true;
        }),

    // 🌍 Favorite Places To Go (Array of values)
    check('preferences.favoritePlacesToGo')
        .optional()
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
        .optional()
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
        .optional()
        .isLength({ max: 160 })
        .withMessage('Bio cannot exceed 160 characters.')
];

module.exports = {
    authValidations,
    userValidations,
    preferencesValidations
};
