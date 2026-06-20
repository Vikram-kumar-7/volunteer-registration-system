const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Volunteer = require('../models/Volunteer');
const User = require('../models/User');

module.exports = {
  // Render public registration form
  getRegisterForm: (req, res) => {
    res.render('volunteer/register', {
      title: 'Volunteer Registration Form',
      errors: [],
      oldInput: {},
      skillsList: ['Teaching', 'Medical', 'Tech', 'Construction', 'Cooking', 'Logistics']
    });
  },

  // Process volunteer registration form
  postRegisterForm: async (req, res) => {
    const skillsList = ['Teaching', 'Medical', 'Tech', 'Construction', 'Cooking', 'Logistics'];
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Map express-validator errors to an array of messages
      const formattedErrors = errors.array().map(err => ({ msg: err.msg, path: err.path }));
      return res.render('volunteer/register', {
        title: 'Volunteer Registration Form',
        errors: formattedErrors,
        oldInput: req.body,
        skillsList
      });
    }

    try {
      const {
        fullName,
        email,
        phone,
        age,
        gender,
        city,
        skills,
        availability,
        experienceLevel,
        motivation,
        emergencyContact,
        password
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.render('volunteer/register', {
          title: 'Volunteer Registration Form',
          errors: [{ msg: 'Email is already registered' }],
          oldInput: req.body,
          skillsList
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create User with try/catch for rollback tracking
      let savedUser;
      try {
        const newUser = new User({
          username: fullName,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'volunteer'
        });
        savedUser = await newUser.save();
      } catch (userErr) {
        console.error('User creation failed:', userErr);
        return res.render('volunteer/register', {
          title: 'Volunteer Registration Form',
          errors: [{ msg: 'User registration failed. Please try again.' }],
          oldInput: req.body,
          skillsList
        });
      }

      // Create Volunteer profile linked to the user
      try {
        // Handle skills array formatting if single skill is checked it comes as string, we make it array
        const formattedSkills = Array.isArray(skills) ? skills : (skills ? [skills] : []);

        const newVolunteer = new Volunteer({
          fullName,
          email: email.toLowerCase(),
          phone,
          age: parseInt(age, 10),
          gender,
          city,
          skills: formattedSkills,
          availability,
          experienceLevel,
          motivation,
          emergencyContact,
          user: savedUser._id,
          status: 'Pending',
          history: [{
            status: 'Pending',
            changedAt: new Date(),
            changedBy: savedUser._id
          }]
        });

        await newVolunteer.save();
        res.redirect('/volunteer/success');
      } catch (volunteerErr) {
        console.error('Volunteer profile creation failed, rolling back User:', volunteerErr);
        if (savedUser) {
          await User.findByIdAndDelete(savedUser._id);
        }
        req.flash('error_msg', 'An error occurred while submitting your registration. Please try again.');
        res.render('volunteer/register', {
          title: 'Volunteer Registration Form',
          errors: [{ msg: 'Database save failed. Please contact administrator.' }],
          oldInput: req.body,
          skillsList
        });
      }
    } catch (err) {
      console.error('Unexpected registration error:', err);
      return res.render('volunteer/register', {
        title: 'Volunteer Registration Form',
        errors: [{ msg: 'An unexpected error occurred. Please try again.' }],
        oldInput: req.body,
        skillsList
      });
    }
  },

  // Render success page
  getSuccess: (req, res) => {
    res.render('volunteer/success', { title: 'Registration Successful!' });
  }
};
