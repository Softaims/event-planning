const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { prisma } = require('../db');
const util = require("util");
const crypto = require('crypto');
const userDto = require('../dtos/userDto');

// JWT Token Generation
const signToken = (user) => {
    return jwt.sign({ user_id: user.id }, process.env.JWT_SECRET_TOKEN, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// JWT Token Verification
const verifyToken = async (token) => {
    return await util.promisify(jwt.verify)(token, process.env.JWT_SECRET_TOKEN);;
};

// Create JWT and Send Response
const createSendToken = async (res, user, statusCode, isSignup = false) => {
    let token = signToken(user);

    // Setup cookie options
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
    };

    res.cookie('event_token', JSON.stringify(token), cookieOptions);

    // Clear the JWT TOKEN IN SIGNUP
    if (!isSignup) {
        // Store the new token in the User table (replaces old one)
        await prisma.user.update({
            where: { id: user.id },
            data: { currentAuthToken: token },
        });
    }
    else {
        token = isSignup ? null : token;
    }

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user: userDto(user) },
    });
};

// Password Hashing
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

// Password Comparison
const comparePassword = async (candidatePassword, userPassword) => {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Find User by Email
const findUserByEmail = async (email) => {
    return await prisma.user.findUnique({
        where: { email },
    });
};

// Find User by Email
const findUserByPhone = async (phoneNumber) => {
    return await prisma.user.findUnique({
        where: { phoneNumber },
    });
};

// Find User by ID
const findUserById = async (id) => {
    return await prisma.user.findUnique({
        where: { id },
    });
};

const registerUser = async (userData) => {
    // Hash the user's password before saving
    userData.password = await hashPassword(userData.password);

    // Create a new user in the database
    const newUser = await prisma.user.create({
        data: userData,
    });

    return newUser;
};

const generateEmailVerificationToken = async (user) => {
    // Generate a 6-digit numeric code
    const verifyEmailCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the code before storing in the database for security
    const hashedCode = hashToken(verifyEmailCode);


    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationToken: hashedCode
        },
    });

    return verifyEmailCode; // Return the plain 6-digit code for sending via email
};

const sendPhoneVerification = async (userId, phoneNumber) => {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    // Hash the code before storing in the database for security
    const hashedCode = hashToken(verificationCode);

    // Save OTP and expiration in the database
    await prisma.user.update({
        where: { id: userId },
        data: {
            phoneVerificationToken: hashedCode
        }
    });

    return verificationCode;
};


const generateToken = () => crypto.randomBytes(20).toString('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createPasswordResetToken = async (user) => {
    const resetToken = generateToken();
    const hashedToken = hashToken(resetToken);

    const expiresIn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: hashedToken,
            passwordResetExpires: expiresIn,
        },
    });

    return resetToken;
};


const resetPassword = async (user, newPassword) => {
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: newPassword,
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordChangedAt: new Date(),
        },
    });
};

const verifyAccount = async (user) => {
    await prisma.user.update({
        where: { id: user.id },
        data: {
            phoneVerified: true,
            phoneVerificationToken: null,
        },
    });
};

const deleteUser = async (userId) => {
    await prisma.user.delete({ where: { id: userId } });
};

module.exports = {
    signToken,
    hashPassword,
    comparePassword,
    findUserByEmail,
    findUserById,
    createSendToken,
    verifyToken,
    registerUser,
    createPasswordResetToken,
    resetPassword,
    generateEmailVerificationToken,
    hashToken,
    verifyAccount,
    findUserByPhone,
    sendPhoneVerification,
    deleteUser
};
