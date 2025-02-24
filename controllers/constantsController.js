const constants = require('../constants');

// Get all available categories
exports.getCategories = (req, res) => {
    const categories = Object.keys(constants);
    res.status(200).json({
        status: 'success',
        data: categories
    });
};

// Get a specific constant category
exports.getConstantsByCategory = (req, res) => {
    const { category } = req.params;

    if (!constants[category]) {
        return res.status(404).json({ status: 'error', message: 'Invalid category' });
    }

    res.status(200).json({
        status: 'success',
        data: constants[category]
    });
};
