const catchAsync = require("../utils/catchAsync");
const authService = require("../services/authService");
const userService = require("../services/userService");
const userDto = require("../dtos/userDto");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");
const s3Service = require("../utils/s3Service"); // S3 handling

// Get Logged-in User's Profile
exports.getMe = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const user = await authService.findUserById(userId);

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Profile fetched successfully.",
    data: userDto(user),
  });
});

// Update Profile Controller
exports.updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const updateData = {};

  // Extract fields
  const { firstName, lastName, email, dob, pronouns, lat, long } = req.body;

  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (email) updateData.email = email;
  if (dob) updateData.dob = new Date(dob);
  if (pronouns) updateData.pronouns = pronouns;

  if (lat !== undefined) {
    const parsedLat = parseFloat(lat);
    if (isNaN(parsedLat))
      return next(new AppError("Invalid latitude format.", 400));
    updateData.lat = parsedLat;
  }

  if (long !== undefined) {
    const parsedLong = parseFloat(long);
    if (isNaN(parsedLong))
      return next(new AppError("Invalid longitude format.", 400));
    updateData.long = parsedLong;
  }

  // Handle profile image upload if provided
  if (req.file) {
    const fileName = `${userId}.jpg`;
    const fileBuffer = req.file.buffer;

    if (process.env.NODE_ENV === "development") {
      const localDir = path.join(__dirname, "../public/images");
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, fileBuffer);
      updateData.profileImage = `/public/images/${fileName}`;
    } else {
      updateData.profileImage = await s3Service.uploadToS3(
        fileBuffer,
        fileName,
        "profileImage"
      );
    }
  }

  // Ensure there are fields to update
  if (Object.keys(updateData).length === 0) {
    return next(new AppError("No valid fields provided for update.", 400));
  }

  const updatedUser = await userService.updateUser(userId, updateData);

  if (!updatedUser) {
    return next(new AppError("User not found.", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully.",
    data: updatedUser,
  });
});
