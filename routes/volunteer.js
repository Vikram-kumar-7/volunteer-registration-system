const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const volunteerController = require('../controllers/volunteerController');

const registrationValidation = [
  check('fullName', 'Full Name is required and must contain letters and spaces only').trim().notEmpty().matches(/^[a-zA-Z\s.-]+$/),
  check('email', 'Please include a valid email address').isEmail().normalizeEmail(),
  check('phone', 'Phone number is required and must contain digits and symbols like + or - only').trim().notEmpty().matches(/^\+?[0-9\s-]+$/),
  check('age', 'Age is required and must be a valid number between 1 and 120').isInt({ min: 1, max: 120 }),
  check('gender', 'Gender is required and must be Male, Female, or Other').isIn(['Male', 'Female', 'Other']),
  check('city', 'City is required and must contain letters and spaces only').trim().notEmpty().matches(/^[a-zA-Z\s.-]+$/),
  check('skills', 'Select at least one valid skill').custom((value) => {
    if (!value) return false;
    const skillsList = ['Teaching', 'Medical', 'Tech', 'Construction', 'Cooking', 'Logistics'];
    const skillsArr = Array.isArray(value) ? value : [value];
    return skillsArr.length > 0 && skillsArr.every(s => skillsList.includes(s));
  }),
  check('availability', 'Availability is required and must be Weekdays, Weekends, or Both').isIn(['Weekdays', 'Weekends', 'Both']),
  check('experienceLevel', 'Experience Level must be Beginner, Intermediate, or Advanced').isIn(['Beginner', 'Intermediate', 'Advanced']),
  check('motivation', 'Motivation details are required').trim().notEmpty(),
  check('emergencyContact', 'Emergency Contact information is required').trim().notEmpty(),
  check('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
  check('confirmPassword', 'Passwords must match').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

// Volunteer registration form - Public
router.get('/register', volunteerController.getRegisterForm);
router.post('/register', registrationValidation, volunteerController.postRegisterForm);

// Volunteer registration success - Public
router.get('/success', volunteerController.getSuccess);

module.exports = router;
