const catchAsync = require('../utils/catchAsync');
const authService = require('../services/authService'); // To check if user exists
const userService = require('../services/userService'); // Handles updates
const userDto = require('../dtos/userDto');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const s3Service = require('../utils/s3Service'); // S3 handling

// Get Logged-in User's Profile
exports.getMe = catchAsync(async (req, res, next) => {
    const userId = req.user.id; 

    // Fetch user details from authService
    const user = await authService.findUserById(userId);

    if (!user) {
        return next(new AppError('User not found.', 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'Profile fetched successfully.',
        data: userDto(user), // Format using DTO
    });
});

// Update Profile Controller
exports.updateProfile = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    let { firstName, lastName, dob, pronouns, preferences, lat, long } = req.body;

    // Convert date fields
    if (dob) dob = new Date(dob);

    // Ensure lat/long are floats
    lat = lat ? parseFloat(lat) : null;
    long = long ? parseFloat(long) : null;

    if (isNaN(lat) || isNaN(long)) {
        return next(new AppError('Invalid latitude or longitude format.', 400));
    }

    // Check if the user exists
    const user = await authService.findUserById(userId);
    if (!user) return next(new AppError('User not found.', 404));

    let profileUrl = user.profileImage;

    // 🟢 Handle profile image upload
    if (req.file) {
        const fileName = `${user.phoneNumber}.jpg`; // Unique filename using phone number
        const fileBuffer = req.file.buffer;

        if (process.env.NODE_ENV === 'development') {
            // Store locally
            const localDir = path.join(__dirname, '../public/images');
            if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

            const localPath = path.join(localDir, fileName);
            fs.writeFileSync(localPath, fileBuffer);
            profileUrl = `/public/images/${fileName}`;
            logger.info(`Profile image stored locally: ${profileUrl}`);
        } else {
            // Store in AWS S3
            profileUrl = await s3Service.uploadToS3(fileBuffer, fileName, "profileImage");
            logger.info(`Profile image uploaded to S3: ${profileUrl}`);
        }
    }

    // Update user profile
    const updatedUser = await userService.updateUserProfile(userId, {
        firstName, lastName, dob, pronouns, profileImage: profileUrl, preferences, lat, long
    });

    res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully.',
        data: { user: userDto(updatedUser) },
    });
});