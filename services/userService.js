const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const { prisma } = require("../db");
const { v4: uuidv4 } = require("uuid");

exports.getUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};


exports.updateUser = async (userId, updateData) => {
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
};
