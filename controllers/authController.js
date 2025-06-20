const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const authService = require("../services/authService");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { prisma } = require("../db");
const twilioService = require("../utils/twilioService");
const s3Service = require("../utils/s3Service");
const { getDefaultPreferences } = require("../utils/preferencesHelper");
const {sendNotification} = require("../services/sendNotification")


// old register api



// exports.register = catchAsync(async (req, res, next) => {
//   let {
//     email,
//     password,
//     firstName,
//     lastName,
//     phoneNumber,
//     dob,
//     pronouns,
//     lat,
//     long,
//     fcmToken, // ✅ Accept FCM Token
//   } = req.body;
//   dob = new Date(dob);

//   lat = lat ? parseFloat(lat) : null;
//   long = long ? parseFloat(long) : null;

//   if (isNaN(lat) || isNaN(long)) {
//     return next(new AppError("Invalid latitude or longitude format.", 400));
//   }

//   // Check if phone already exists
//   const existingUser = await authService.findUserByPhone(phoneNumber);
//   if (existingUser) {
//     if (!existingUser.phoneVerified) {
//       // 🟢 User exists but not verified → Resend OTP and return success response
//       const verificationCode = await authService.sendPhoneVerification(
//         existingUser.id
//       );
//       console.log("verificationCode : ", verificationCode);

//       try {
//         if (process.env.NODE_ENV !== "development") {
//           await twilioService.sendVerificationCode(
//             existingUser.phoneNumber,
//             verificationCode
//           );
//         }
//       } catch (err) {
//         logger.error(
//           `Failed to resend verification code to: ${existingUser.phoneNumber}: ${err}`
//         );
//         return next(
//           new AppError(
//             "Failed to send verification code. Try again later.",
//             500
//           )
//         );
//       }

//       return authService.createSendToken(
//         res,
//         existingUser,
//         200, // HTTP Status
//         false, // isSignup
//         "User already registered but not verified. OTP sent again for verification."
//       );
//     }

//     return next(new AppError("Phone number already in use.", 401)); // If user is verified, prevent re-registration
//   }

//   let profileUrl = null;
//   // 🟢 Handle single file upload (profileImage)
//   if (req.file) {
//     const fileName = `${phoneNumber}.jpg`; // Name file uniquely with phone number
//     const fileBuffer = req.file.buffer;

//     if (process.env.NODE_ENV === "development") {
//       // 🌍 Store locally in 'public/images/'
//       const localDir = path.join(__dirname, "../public/images");
//       if (!fs.existsSync(localDir)) {
//         fs.mkdirSync(localDir, { recursive: true });
//       }

//       const localPath = path.join(localDir, fileName);
//       fs.writeFileSync(localPath, fileBuffer);
//       profileUrl = `/public/images/${fileName}`;
//       logger.info(`Profile image stored locally: ${profileUrl}`);
//     } else {
//       // ☁️ Store in AWS S3
//       profileUrl = await s3Service.uploadToS3(
//         fileBuffer,
//         fileName,
//         "profileImage"
//       );
//       logger.info(`Profile image uploaded to S3: ${profileUrl}`);
//     }
//   }

//   // Get Default Preferences
//   const defaultPreferences = getDefaultPreferences();

//   // Register the user
//   const newUser = await authService.registerUser({
//     email,
//     password,
//     firstName,
//     lastName,
//     phoneNumber,
//     dob,
//     pronouns,
//     profileImage: profileUrl,
//     isRegistrationComplete: true,
//     preferences: defaultPreferences,
//     lat,
//     long,
//     fcmToken, // ✅ Save FCM Token in DB
//   });

//   // Send OTP via Twilio
//   const verificationCode = await authService.sendPhoneVerification(newUser.id);
//   console.log("verificationCode : ", verificationCode);

//   try {
//     // Send SMS via Twilio
//     if (process.env.NODE_ENV !== "development") {
//       await twilioService.sendVerificationCode(
//         newUser.phoneNumber,
//         verificationCode
//       );
//     }
//   } catch (err) {
//     logger.error(
//       `Failed to send verification code to: ${newUser.phoneNumber}`,
//       err
//     );
//     // 🛑 **Delete the user if OTP fails**
//     await authService.deleteUser(newUser.id);
//     return next(new AppError("Failed to send verification code.", 500));
//   }

//   // Send JWT token
//   authService.createSendToken(
//     res,
//     newUser,
//     200,
//     (isSignup = false),
//     "Register Successfully! OTP sent for verification."
//   );

//   logger.info(`User registered: ${newUser.phoneNumber}`);
// });


// not working new api

// exports.register = catchAsync(async (req, res, next) => {
//   let {
//     email,
//     password,
//     firstName,
//     lastName,
//     phoneNumber,
//     dob,
//     pronouns,
//     lat,
//     long,
//     fcmToken,
//     // username,
//     uniqueCode = "NORMAL", // Default to "NORMAL"
//   } = req.body;

//   dob = new Date(dob);
//   lat = lat ? parseFloat(lat) : null;
//   long = long ? parseFloat(long) : null;

//   if (isNaN(lat) || isNaN(long)) {
//     return next(new AppError("Invalid latitude or longitude format.", 400));
//   }

//   const existingUser = await authService.findUserByPhone(phoneNumber);
//   if (existingUser) {
//     if (!existingUser.phoneVerified) {
//       const verificationCode = await authService.sendPhoneVerification(existingUser.id);

//       try {
//         if (process.env.NODE_ENV !== "development") {
//           await twilioService.sendVerificationCode(existingUser.phoneNumber, verificationCode);
//         }
//       } catch (err) {
//         logger.error(`Failed to resend verification code: ${err}`);
//         return next(new AppError("Failed to send verification code. Try again later.", 500));
//       }

//       return authService.createSendToken(
//         res,
//         existingUser,
//         200,
//         false,
//         "User already registered but not verified. OTP sent again."
//       );
//     }

//     return next(new AppError("Phone number already in use.", 401));
//   }

//   let profileUrl = null;
//   if (req.file) {
//     const fileName = `${phoneNumber}.jpg`;
//     const fileBuffer = req.file.buffer;

//     if (process.env.NODE_ENV === "development") {
//       const localDir = path.join(__dirname, "../public/images");
//       if (!fs.existsSync(localDir)) {
//         fs.mkdirSync(localDir, { recursive: true });
//       }

//       const localPath = path.join(localDir, fileName);
//       fs.writeFileSync(localPath, fileBuffer);
//       profileUrl = `/public/images/${fileName}`;
//     } else {
//       profileUrl = await s3Service.uploadToS3(fileBuffer, fileName, "profileImage");
//     }
//   }

//   // 🔢 Auto-increment logic
//   const totalUsers = await authService.countUsers();
//   const userRegistrationNumber = totalUsers + 1;
//   const is_limit_crossed = userRegistrationNumber > 10;

//   const defaultPreferences = getDefaultPreferences();

//   const newUser = await authService.registerUser({
//     email,
//     password,
//     firstName,
//     lastName,
//     phoneNumber,
//     dob,
//     pronouns,
//     profileImage: profileUrl,
//     isRegistrationComplete: true,
//     preferences: defaultPreferences,
//     lat,
//     long,
//     fcmToken,
//     // username,
//     uniqueCode,
//     userRegistrationNumber,
//     is_limit_crossed,
//   });

//   const verificationCode = await authService.sendPhoneVerification(newUser.id);
//   try {
//     if (process.env.NODE_ENV !== "development") {
//       await twilioService.sendVerificationCode(newUser.phoneNumber, verificationCode);
//     }
//   } catch (err) {
//     logger.error(`Failed to send verification code: `, err);
//     await authService.deleteUser(newUser.id);
//     return next(new AppError("Failed to send verification code.", 500));
//   }

//   authService.createSendToken(
//     res,
//     newUser,
//     200,
//     false,
//     "Register Successfully! OTP sent for verification."
//   );
// });


//-------------------------- New Flow form 29 may 2025 -----------------------//

exports.sendPhoneNumber = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return next(new AppError("Phone number is required", 400));
  }

  const existingUser = await authService.findUserByPhone(phoneNumber);

  if (existingUser) {
    if (existingUser.isRegistrationComplete) {
      return next(new AppError("User already registered with this phone number.", 400));
    }

    // Resend OTP
    const verificationCode = await authService.sendPhoneVerification(existingUser.id);

    try {
      if (process.env.NODE_ENV !== "development") {
        await twilioService.sendVerificationCode(existingUser.phoneNumber, verificationCode);
      }
    } catch (err) {
      logger.error(`Failed to resend verification code: ${err}`);
      return next(new AppError("Failed to send verification code. Try again later.", 500));
    }

    return res.status(200).json({
      status: "success",
      message: "User already exists but not verified. OTP sent again.",
      data: { userId: existingUser.id }
    });
  }

  // Create a new user with phone only
  const newUser = await authService.registerUser({
    phoneNumber,
    isRegistrationComplete: false,
  });

  const verificationCode = await authService.sendPhoneVerification(newUser.id);

  try {
    if (process.env.NODE_ENV !== "development") {
      await twilioService.sendVerificationCode(phoneNumber, verificationCode);
    }
  } catch (err) {
    logger.error(`Failed to send verification code: ${err}`);
    await authService.deleteUser(newUser.id);
    return next(new AppError("Failed to send verification code. Try again later.", 500));
  }

  return res.status(201).json({
    status: "success",
    message: "OTP sent to phone number.",
    data: { userId: newUser.id }
  });
});


exports.register = catchAsync(async (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) {
    return next(new AppError("Unauthorized. User ID not found in request.", 401));
  }

  const {
    email,
    password,
    firstName,
    lastName,
    dob,
    pronouns,
    lat,
    long,
    fcmToken,
    uniqueCode = "NORMAL",
  } = req.body;

  const user = await authService.findUserById(userId);

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  if (user.isRegistrationComplete) {
    return next(new AppError("Registration already completed.", 400));
  }

  const parsedDob = new Date(dob);
  const parsedLat = lat ? parseFloat(lat) : null;
  const parsedLong = long ? parseFloat(long) : null;

  if (isNaN(parsedLat) || isNaN(parsedLong)) {
    return next(new AppError("Invalid latitude or longitude format.", 400));
  }

  let profileUrl = null;
  if (req.file) {
    const fileName = `${user.phoneNumber}.jpg`;
    const fileBuffer = req.file.buffer;

    if (process.env.NODE_ENV === "development") {
      const localDir = path.join(__dirname, "../public/images");
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, fileBuffer);
      profileUrl = `/public/images/${fileName}`;
    } else {
      profileUrl = await s3Service.uploadToS3(fileBuffer, fileName, "profileImage");
    }
  }

  // 🔢 Auto-increment logic
  const totalUsers = await authService.countUsers();
  const userRegistrationNumber = totalUsers + 1;
  const is_limit_crossed = userRegistrationNumber > 1000;

  const defaultPreferences = getDefaultPreferences();

  const updatedUser = await authService.completeUserRegistration(userId, {
    email,
    password,
    firstName,
    lastName,
    dob: parsedDob,
    pronouns,
    lat: parsedLat,
    long: parsedLong,
    profileImage: profileUrl,
    fcmToken,
    uniqueCode,
    userRegistrationNo: userRegistrationNumber,
    isLimitCrossed : is_limit_crossed,
    preferences: defaultPreferences,
  });

  authService.createSendToken(
    res,
    updatedUser,
    200,
    true,
    "Registration completed successfully."
  );
});





//-------------------------- New Flow form 29 may 2025 -----------------------//



// old api of verify otp

// exports.verifyPhoneCode = catchAsync(async (req, res, next) => {
//   const { otp } = req.body; // User submits email and OTP
//   console.log("OTP Provided:", otp);

//   if (!otp) {
//     return next(new AppError("Verification code is required.", 401));
//   }

//   const otpString = String(otp).trim();
//   const hashedOtp = authService.hashToken(otpString); // Hash OTP for security
//   console.log("Hashed OTP:", hashedOtp);

//   // Find user with matching email and OTP
//   const user = await prisma.user.findFirst({
//     where: {
//       phoneVerificationToken: hashedOtp, // Check OTP match
//       phoneVerificationTokenExpires: { gte: new Date() }, // Not expired
//     },
//   });

//   console.log("user : ", user);

//   if (!user) {
//     return next(new AppError("Invalid or expired OTP.", 401));
//   }

//   // Mark email as verified and remove OTP
//   const updatedUser = await authService.verifyAccount(user);
//   authService.createSendToken(
//     res,
//     updatedUser,
//     200,
//     (isSignup = false),
//     "Phone Number verified successfully!"
//   );
// });

// new verify otp api from 29 may 2025.

exports.verifyPhoneCode = catchAsync(async (req, res, next) => {
  const { otp, phoneNumber } = req.body;

  if (!otp || !phoneNumber) {
    return next(new AppError("Phone number and OTP are required.", 400));
  }

  const otpString = String(otp).trim();
  const hashedOtp = authService.hashToken(otpString); // Hashed for secure lookup

  const user = await prisma.user.findFirst({
    where: {
      phoneNumber,
      phoneVerificationToken: hashedOtp,
      phoneVerificationTokenExpires: { gte: new Date() },
    },
  });

  if (!user) {
    return next(new AppError("Invalid or expired OTP.", 401));
  }

  if (user.phoneVerified && user.isRegistrationComplete) {
    return next(new AppError("Phone number is already verified and user is fully registered.", 409));
  }

  // Mark phone as verified and clear OTP
  const updatedUser = await authService.verifyAccount(user);

  return authService.createSendToken(
    res,
    updatedUser,
    200,
    false,
    "Phone number verified successfully!"
  );
});


exports.resendVerificationCode = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body; // User provides phoneNumber in request

  if (!phoneNumber) {
    return next(
      new AppError("Phone Number is required to resend verification code.", 401)
    );
  }

  // Find user by phoneNumber
  const user = await prisma.user.findUnique({
    where: { phoneNumber, phoneVerified: false },
  });

  if (!user) {
    return next(
      new AppError("No unverified user found with this phone number.", 401)
    );
  }

  if (user.phoneVerified) {
    return next(new AppError("Phone number is already verified.", 401));
  }

  // Check if the existing OTP is still valid
  if (
    user.phoneVerificationToken &&
    user.phoneVerificationTokenExpires > new Date()
  ) {
    return next(
      new AppError(
        "A verification code was already sent. Please wait before requesting a new one.",
        401
      )
    );
  }

  // Send OTP via Twilio
  const verificationCode = await authService.sendPhoneVerification(user.id);
  console.log("verificationCode: ", verificationCode);

  try {
    // Send SMS via Twilio
    if (process.env.NODE_ENV !== "development") {
      await twilioService.sendVerificationCode(
        user.phoneNumber,
        verificationCode
      );
    }
    logger.info(`Verification code resent to: ${user.phoneNumber}`);
    authService.createSendToken(
      res,
      user,
      200,
      (isSignup = false),
      "Verification code resent successfully!"
    );
  } catch (err) {
    logger.error(
      `Failed to resend verification code to: ${user.phoneNumber}`,
      err
    );
    // Remove expired token to allow retry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerificationToken: null,
        phoneVerificationTokenExpires: null,
      },
    });
    return next(new AppError("Failed to send verification code.", 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { phoneNumber, password, fcmToken } = req.body;

  const user = await authService.findUserByPhone(phoneNumber);

  if (!user || !(await authService.comparePassword(password, user.password))) {
    logger.error(`Invalid login attempt for phoneNumber: ${phoneNumber}`);
    return next(new AppError("Incorrect Phone Number or password.", 401));
  }

  if (!user.phoneVerified) {
    return next(new AppError("Please verify your phone number.", 401));
  }

  // Store the FCM token if provided
  if (fcmToken) {
    await prisma.user.update({
      where: { id: user.id },
      data: { fcmToken: fcmToken },
    });
  }
  // Send welcome notification
await sendNotification(user.id, {
  title: "Welcome to UNI 🎉",
  body: "Dive into exciting events and discover something new every day!",
});

  authService.createSendToken(
    res,
    user,
    200,
    (isSignup = false),
    (message = "Login Successfully!")
  );
});


exports.logout = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("You are not logged in!", 401));
  }

    // Remove the stored JWT from the database
    await prisma.user.update({
        where: { id: req.user.id },
        data: { currentAuthToken: null ,fcmToken: null},
    });

  res.cookie("event_token", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true, // Ensures the cookie is not accessible via client-side scripts
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "Strict", // Adjust based on your application's needs
  });

  logger.info("User logged out and FCM token removed");
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body;

  // 1) Get user based on phone number
  const user = await authService.findUserByPhone(phoneNumber);
  if (!user) {
    logger.error(
      `Password reset requested for non-existent phone number: ${phoneNumber}`
    );
    return next(new AppError("No user found with this phone number.", 401));
  }

  // 2) Check if the existing OTP is still valid
  if (user.passwordResetToken && user.passwordResetExpires > new Date()) {
    return next(
      new AppError(
        "A password reset code was already sent. Please wait before requesting a new one.",
        401
      )
    );
  }

  // 3) Generate a 6-digit numeric OTP
  const resetToken = crypto.randomInt(100000, 999999).toString();
  console.log("Generated OTP:", resetToken);
  const hashedToken = authService.hashToken(resetToken);

  const expiryTime = new Date();
  expiryTime.setUTCMinutes(expiryTime.getUTCMinutes() + 10);

  // 4) Save OTP in the database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: expiryTime,
    },
  });

  try {
    // Send SMS via Twilio
    if (process.env.NODE_ENV !== "development") {
      await twilioService.sendVerificationCode(user.phoneNumber, resetToken);
    }
    logger.info(`Password reset OTP sent to: ${user.phoneNumber}`);

    res.status(200).json({
      status: "success",
      message: "Password reset OTP sent to your phone number!",
    });
  } catch (err) {
    logger.error(
      `Error sending password reset code to: ${user.phoneNumber}`,
      err
    );

    // If sending OTP fails, remove it from the database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return next(new AppError("Failed to send password reset code.", 500));
  }
});

exports.verifyPasswordOtp = catchAsync(async (req, res, next) => {
  const { otp, phoneNumber } = req.body;
  console.log("OTP Provided:", otp);

  if (!otp || !phoneNumber) {
    return next(
      new AppError("Verification code and phone Number is required.", 401)
    );
  }

  const otpString = String(otp).trim();
  const hashedOtp = authService.hashToken(otpString);
  console.log("Hashed OTP:", hashedOtp);

  // Find user with matching OTP
  const user = await prisma.user.findFirst({
    where: {
      phoneNumber,
      passwordResetToken: hashedOtp, // Check OTP match
      passwordResetExpires: { gte: new Date() }, // Not expired
    },
  });

  if (!user) {
    return next(new AppError("Invalid or expired OTP.", 401));
  }

  res.status(200).json({
    status: "success",
    message: "OTP verified successfully! You can now reset your password.",
    userId: user.id, // Send user ID to use in reset password request
  });
});

exports.resendPasswordOtp = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return next(
      new AppError("Phone Number is required to resend verification code.", 401)
    );
  }

  // Find user by phoneNumber
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    return next(new AppError("No user found with this phone number.", 401));
  }

  // Check if existing OTP is still valid
  if (user.passwordResetToken && user.passwordResetExpires > new Date()) {
    return next(
      new AppError(
        "A verification code was already sent. Please wait before requesting a new one.",
        401
      )
    );
  }

  // Generate a new OTP
  const resetToken = crypto.randomInt(100000, 999999).toString();
  const hashedToken = authService.hashToken(resetToken);

  const expiryTime = new Date();
  expiryTime.setUTCMinutes(expiryTime.getUTCMinutes() + 10);

  // Update user with new OTP
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: expiryTime,
    },
  });

  try {
    // Send OTP via Twilio
    if (process.env.NODE_ENV !== "development") {
      await twilioService.sendVerificationCode(user.phoneNumber, resetToken);
    }

    res.status(200).json({
      status: "success",
      message: "Verification code resent successfully!",
    });
  } catch (err) {
    logger.error(
      `Failed to resend verification code to: ${user.phoneNumber}`,
      err
    );
    return next(new AppError("Failed to send verification code.", 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password, phoneNumber } = req.body;

  if (!password || !phoneNumber) {
    return next(
      new AppError("Phone Number and new password are required.", 401)
    );
  }
  // Find user by phoneNumber
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    return next(new AppError("Invalid user ID.", 401));
  }

  // Update password and clear reset fields
  const hashedPassword = await authService.hashPassword(password);
  await authService.resetPassword(user, hashedPassword);

  res.status(200).json({
    status: "success",
    message: "Password has been reset successfully. You can now log in.",
  });
});
