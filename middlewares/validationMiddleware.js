const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If there are validation errors, return a 401 response with the error details
        return next(new AppError(errors.array().map(err => err.msg).join(', '), 401));
    }
    next();
};

