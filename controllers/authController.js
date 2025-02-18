const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { prisma } = require('../db');
const twilioService = require('../utils/twilioService');

exports.register = catchAsync(async (req, res, next) => {
    let { email, password, firstName, lastName, phoneNumber, dob, pronouns, profileImage } = req.body;
    dob = new Date(dob)

    // Check if phone already exists
    const existingUser = await authService.findUserByPhone(phoneNumber);
    if (existingUser) {
        return next(new AppError('Phone number already in use.', 400));
    }

    // Register the user
    const newUser = await authService.registerUser({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        dob,
        pronouns,
        profileImage,
    });

    // Send OTP via Twilio
    const verificationCode = await authService.sendPhoneVerification(newUser.id, newUser.phoneNumber);

    try {
        // Send SMS via Twilio
        await twilioService.sendVerificationCode(newUser.phoneNumber, verificationCode);
    } catch (err) {
        logger.error(`Failed to send verification code to: ${newUser.phoneNumber}`, err);
        // 🛑 **Delete the user if OTP fails**
        // await authService.deleteUser(newUser.id);
        return next(new AppError('Failed to send verification code.', 500));
    }

    // Send JWT token
    authService.createSendToken(res, newUser, 201, isSignup = true);

    logger.info(`User registered: ${newUser.phoneNumber}`);
});

exports.verifyPhoneCode = catchAsync(async (req, res, next) => {
    const { otp } = req.params; // User submits email and OTP
    console.log("OTP Provided:", otp);

    if (!otp) {
        return next(new AppError('Verification code are required.', 400));
    }

    const hashedOtp = authService.hashToken(otp); // Hash OTP for security
    console.log("Hashed OTP:", hashedOtp);

    // Find user with matching email and OTP
    const user = await prisma.user.findFirst({
        where: {
            phoneVerificationToken: hashedOtp, // Check OTP match
        },
    });

    if (!user) {
        return next(new AppError('Invalid OTP', 400));
    }

    // Mark email as verified and remove OTP
    await authService.verifyAccount(user);

    res.status(200).json({
        status: "success",
        message: "Phone Number verified successfully! You can now log in."
    });
});

exports.resendVerificationCode = catchAsync(async (req, res, next) => {
    const { phoneNumber } = req.body; // User provides phoneNumber in request

    if (!phoneNumber) {
        return next(new AppError('Phone Number is required to resend verification code.', 400));
    }

    // Find user by phoneNumber
    const user = await prisma.user.findUnique({
        where: { phoneNumber, phoneVerified: false },
    });

    if (!user) {
        return next(new AppError('No unverified user found with this phone number.', 404));
    }

    // Send OTP via Twilio
    const verificationCode = await authService.sendPhoneVerification(user.id, user.phoneNumber);

    try {
        // Send SMS via Twilio
        await twilioService.sendVerificationCode(user.phoneNumber, verificationCode);
        logger.info(`Verification code resent to: ${user.phoneNumber}`);
        res.status(200).json({ message: 'Verification code resent successfully!' });
    } catch (err) {
        logger.error(`Failed to resend verification code to: ${user.phoneNumber}`, err);
        return next(new AppError('Failed to send verification code.', 500));
    }
});

exports.login = catchAsync(async (req, res, next) => {
    const { phoneNumber, password } = req.body;

    const user = await authService.findUserByPhone(phoneNumber);

    if (!user || !(await authService.comparePassword(password, user.password))) {
        logger.error(`Invalid login attempt for phoneNumber: ${phoneNumber}`);
        return next(new AppError('Incorrect Phone Number or password.', 401));
    }

    if (!user.phoneVerified) {
        return next(new AppError('Please verify your phone number.', 401));
    }

    authService.createSendToken(res, user, 200);
});

exports.logout = catchAsync(async (req, res, next) => {

    if (!req.user) {
        return next(new AppError('You are not logged in!', 401));
    }

    // Remove the stored JWT from the database
    await prisma.user.update({
        where: { id: req.user.id },
        data: { currentAuthToken: null },
    });

    res.cookie('event_token', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
        httpOnly: true, // Ensures the cookie is not accessible via client-side scripts
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        sameSite: "Strict", // Adjust based on your application's needs
    });

    logger.info('User logged out');
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { phoneNumber } = req.body;

    // 1) Get user based on email
    const user = await authService.findUserByPhone(phoneNumber);
    if (!user) {
        logger.error(`Password reset requested for non-existent phone number: ${phoneNumber}`);
        return next(new AppError('There is no user with that phone number.', 400));
    }

    // 2) Generate a 6-digit numeric OTP
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = authService.hashToken(resetToken);

    // 3) Save OTP in database
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: hashedToken,
        },
    });


    try {
        // Send SMS via Twilio
        await twilioService.sendVerificationCode(user.phoneNumber, verificationCode);
        logger.info(`Password reset OTP sent to: ${user.phoneNumber}`);
        res.status(200).json({
            status: 'success',
            message: 'Password reset OTP sent to your phone number!',
        });
    } catch (err) {
        logger.error(`Error sending password reset code to: ${user.phoneNumber}`, err);

        // If email fails, remove OTP from database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: null
            },
        });

        return next(new AppError('There was an error sending the code. Try again later!', 500));
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const { otp } = req.params;
    const hashedOtp = authService.hashToken(otp); // Hash OTP for security

    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: hashedOtp
        },
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        logger.error(`Invalid or expired password reset token used.`);
        return next(new AppError('Token is invalid or has expired', 400));
    }

    // 3) Update password and clear reset fields
    const hashedPassword = await authService.hashPassword(req.body.password);
    await authService.resetPassword(user, hashedPassword);

    // 4) Log the user in, send JWT
    logger.info(`Password reset successfully for user: ${user.phoneNumber}`);

    res.status(200).json({
        status: 'success',
        message: 'Password has been reset successfully. You can now log in.',
    });
});
