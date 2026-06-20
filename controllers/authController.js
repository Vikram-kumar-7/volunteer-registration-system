const passport = require('passport');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

module.exports = {
  // Render login page
  getLogin: (req, res) => {
    res.render('auth/login', { title: 'Login - Volunteer Hub' });
  },

  // Handle login submit
  postLogin: (req, res, next) => {
    passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: true
    })(req, res, next);
  },

  // Render register page
  getRegister: (req, res) => {
    res.render('auth/register', { title: 'Register - Admin Setup' });
  },

  // Handle registration submit
  postRegister: async (req, res) => {
    const { username, email, password, confirmPassword, secretCode } = req.body;
    let errors = [];

    // Validations
    if (!username || !email || !password || !confirmPassword || !secretCode) {
      errors.push({ msg: 'Please fill in all fields' });
    }

    if (password !== confirmPassword) {
      errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
      errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (secretCode !== process.env.ADMIN_SECRET_CODE) {
      errors.push({ msg: 'Invalid Administrator Secret Code' });
    }

    if (errors.length > 0) {
      return res.render('auth/register', {
        title: 'Register - Admin Setup',
        errors,
        username,
        email,
        secretCode
      });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        errors.push({ msg: 'Email is already registered' });
        return res.render('auth/register', {
          title: 'Register - Admin Setup',
          errors,
          username,
          email,
          secretCode
        });
      }

      // Check if username is taken
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        errors.push({ msg: 'Username is already taken' });
        return res.render('auth/register', {
          title: 'Register - Admin Setup',
          errors,
          username,
          email,
          secretCode
        });
      }

      // Create new user instance
      const newUser = new User({
        username,
        email,
        password
      });

      // Salt & Hash password
      const salt = await bcrypt.genSalt(10);
      newUser.password = await bcrypt.hash(password, salt);

      // Save user
      await newUser.save();

      req.flash('success_msg', 'Admin registered successfully. You can now log in.');
      res.redirect('/login');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'An error occurred during registration.');
      res.redirect('/register');
    }
  },

  // Handle logout
  logout: (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success_msg', 'You are logged out');
      res.redirect('/login');
    });
  },

  // GET Forgot Password
  getForgot: (req, res) => {
    res.render('auth/forgot', { title: 'Forgot Password' });
  },

  // POST Forgot Password
  postForgot: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        req.flash('error_msg', 'No account with that email address exists.');
        return res.redirect('/forgot-password');
      }

      // Generate token
      const token = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Transporter
      let transporter;
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } else {
        transporter = {
          sendMail: async (mailOptions) => {
            console.log('--- DEVELOPMENT MAIL LOG ---');
            console.log('To:', mailOptions.to);
            console.log('Subject:', mailOptions.subject);
            console.log('Text:', mailOptions.text);
            console.log('-----------------------------');
            return { messageId: 'dev-mock-id' };
          }
        };
      }

      const resetUrl = `http://${req.headers.host}/reset/${token}`;
      const mailOptions = {
        to: user.email,
        from: process.env.EMAIL_USER || 'no-reply@volunteerhub.com',
        subject: 'Volunteer Hub - Password Reset Link',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
          `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
          `${resetUrl}\n\n` +
          `If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };

      await transporter.sendMail(mailOptions);
      req.flash('success_msg', `An email has been sent to ${user.email} with further instructions.`);
      res.redirect('/login');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'An error occurred during password reset request');
      res.redirect('/forgot-password');
    }
  },

  // GET Reset Password
  getReset: async (req, res) => {
    try {
      const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        req.flash('error_msg', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot-password');
      }

      res.render('auth/reset', { title: 'Reset Password', token: req.params.token });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'An error occurred loading reset view');
      res.redirect('/login');
    }
  },

  // POST Reset Password
  postReset: async (req, res) => {
    try {
      const { password, confirmPassword } = req.body;
      if (password !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match.');
        return res.redirect('back');
      }

      const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        req.flash('error_msg', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot-password');
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      // Log in user automatically
      req.logIn(user, (err) => {
        if (err) {
          console.error(err);
          req.flash('success_msg', 'Your password has been updated. Please log in.');
          return res.redirect('/login');
        }
        req.flash('success_msg', 'Password reset successful! You are now logged in.');
        res.redirect('/');
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'An error occurred resetting your password');
      res.redirect('/forgot-password');
    }
  }
};
