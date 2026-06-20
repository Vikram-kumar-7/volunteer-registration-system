const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const userController = require('../controllers/userController');
const { ensureAuthenticated, ensureVolunteer } = require('../middleware/auth');

// Multer Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, 'avatar_' + req.user._id + '_' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed!'));
  }
});

// Protect all routes
router.use(ensureAuthenticated);
router.use(ensureVolunteer);

// User dashboard
router.get('/dashboard', userController.getDashboard);

// User Profile
router.get('/profile', userController.getProfile);
router.post('/profile', userController.updateProfile);
router.post('/profile/upload', upload.single('avatar'), userController.uploadProfilePicture, (error, req, res, next) => {
  req.flash('error_msg', error.message);
  res.redirect('/user/profile');
});

// Application tracker
router.get('/application', userController.getApplicationStatus);

// Activity history
router.get('/history', userController.getHistory);

// Join and View Events
router.get('/events', userController.getEvents);
router.post('/events/:id/join', userController.joinEvent);

// Notification mark as read
postLoginRedirect = (req, res) => {
  res.redirect('/');
};
router.post('/notifications/:id/read', userController.markNotificationRead);

module.exports = router;
