const express = require('express');
const { getMe, updateProfile } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware'); // Ensure authentication
const { userValidations } = require('../validators/validation');
const validationMiddleware = require('../middlewares/validationMiddleware');
const router = express.Router();

router.use(protect);
router.get('/me', getMe);
// router.patch('/update-profile', 
//     userValidations.updateProfile, 
//     validationMiddleware.validate, 
//     updateProfile
// );

module.exports = router;