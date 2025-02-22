const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Extract error messages into an array
        const errorMessages = errors.array().map(err => err.msg);

        // Convert array into a single string but formatted for readability
        return next(new AppError(errorMessages.join(' | '), 401));
    }
    next();
};