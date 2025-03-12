// utils/multer.js
const multer = require('multer');
const path = require('path');

// File filter to ensure only images are uploaded
const fileFilter = (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype ||  extname) {
        cb(null, true);
    } else {
        cb(new Error('Only images (jpeg, jpg, png) are allowed.'));
    }
};

// Multer configuration to limit file size and accept images only
const upload = multer({
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit to 2 MB
    fileFilter: fileFilter,
    storage: multer.memoryStorage() // Store files in memory before uploading to S3
});

module.exports = upload;
