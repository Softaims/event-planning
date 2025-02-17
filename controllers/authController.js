const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const EmailService = require('../services/EmailService');
const { prisma } = require('../db');

exports.register = catchAsync(async (req, res, next) => {
    let { email, password, firstName, lastName, phoneNumber, dob, pronouns, profileImage } = req.body;

    dob = new Date(dob)

    // Check if the user already exists
    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
        logger.error(`Registration attempt with existing email: ${email}`);
        return next(new AppError('Email already in use.', 409));
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

    // Generate email verification token
    const verificationToken = await authService.generateEmailVerificationToken(newUser);

    console.log("verificationToken :", verificationToken)

    // Send verification email in the background
    setImmediate(async () => {
        const emailService = new EmailService(newUser, verificationToken); // Pass the 6-digit code
        try {
            await emailService.sendVerificationEmail();
            logger.info(`Verification email sent to: ${newUser.email}`);
        } catch (err) {
            logger.error(`Failed to send verification email to: ${newUser.email}`, err);
            await authService.verifyAccount(newUser, true);
            return next(new AppError('There was an error sending the email. Try again later!', 500));
        }
    });

    // Send JWT token
    authService.createSendToken(res, newUser, 201, isSignup = true);

    logger.info(`User registered: ${newUser.email}`);
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
    const { otp } = req.params; // User submits email and OTP
    console.log("OTP Provided:", otp);

    const hashedOtp = authService.hashToken(otp); // Hash OTP for security
    console.log("Hashed OTP:", hashedOtp);

    // Find user with matching email and OTP
    const user = await prisma.user.findFirst({
        where: {
            emailVerificationToken: hashedOtp, // Check OTP match
        },
    });

    if (!user) {
        return next(new AppError('Invalid OTP', 400));
    }

    // Mark email as verified and remove OTP
    await authService.verifyAccount(user);

    res.status(200).json({
        status: "success",
        message: "Email verified successfully! You can now log in."
    });
});

exports.resendVerificationEmail = catchAsync(async (req, res, next) => {
    const { email } = req.body; // User provides email in request

    if (!email) {
        return next(new AppError('Email is required to resend verification code.', 400));
    }

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email, emailVerified: false }, // Ensure email is not verified already
    });

    if (!user) {
        return next(new AppError('No unverified user found with this email.', 404));
    }

    // Generate a new OTP and store it in the database
    const verificationToken = await authService.generateEmailVerificationToken(user);

    // Send the new OTP via email
    const emailService = new EmailService(user, verificationToken);
    try {
        await emailService.sendVerificationEmail();
        logger.info(`Verification email resent to: ${user.email}`);
        res.status(200).json({ message: 'Verification email resent successfully!' });
    } catch (err) {
        logger.error(`Failed to resend verification email to: ${user.email}`, err);
        return next(new AppError('Failed to send verification email.', 500));
    }
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await authService.findUserByEmail(email);

    if (!user || !(await authService.comparePassword(password, user.password))) {
        logger.error(`Invalid login attempt for email: ${email}`);
        return next(new AppError('Incorrect email or password.', 401));
    }

    if (!user.emailVerified) {
        return next(new AppError('Please verify your email address.', 401));
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
    const { email } = req.body;

    // 1) Get user based on email
    const user = await authService.findUserByEmail(email);
    if (!user) {
        logger.error(`Password reset requested for non-existent email: ${email}`);
        return next(new AppError('There is no user with that email address.', 404));
    }

    // 2) Generate a 6-digit numeric OTP
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = authService.hashToken(resetToken);

    // 3) Save OTP in database (expires in 10 minutes)
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: hashedToken,
            passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000), // Expires in 10 minutes
        },
    });

    // 4) Send OTP via email
    try {
        const emailService = new EmailService(user, resetToken); // Send plain OTP
        await emailService.sendPasswordReset();

        logger.info(`Password reset OTP sent to: ${user.email}`);
        res.status(200).json({
            status: 'success',
            message: 'Password reset OTP sent to your email!',
        });
    } catch (err) {
        logger.error(`Error sending password reset email to: ${user.email}`, err);

        // If email fails, remove OTP from database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });

        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }
});


exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const { otp } = req.params;
    const hashedOtp = authService.hashToken(otp); // Hash OTP for security

    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: hashedOtp,
            passwordResetExpires: { gt: new Date() },
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
    logger.info(`Password reset successfully for user: ${user.email}`);

    res.status(200).json({
        status: 'success',
        message: 'Password has been reset successfully. You can now log in.',
    });
});
