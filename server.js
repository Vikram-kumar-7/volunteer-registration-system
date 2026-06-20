require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const connectDB = require('./config/db');

// Security Libraries
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Initialize Express
const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(mongoSanitize());

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests, please try again later.'
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login or registration attempts, please try again in 15 minutes.'
});
app.use('/login', authLimiter);
app.use('/register', authLimiter);
app.use('/volunteer/register', authLimiter);

// Connect to MongoDB
connectDB();

// Passport Config
require('./config/passport')(passport);

// Bodyparser Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method Override
app.use(methodOverride('_method'));

// Express Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'volunteer_secret_key_2026',
    resave: false,
    saveUninitialized: false
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash Middleware
app.use(flash());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Global Variables middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error'); // For passport local error flash messages
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Import Routes
const authRoutes = require('./routes/auth');
const volunteerRoutes = require('./routes/volunteer');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

// Mount Routes
app.use('/', authRoutes);
app.use('/volunteer', volunteerRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);

// Root redirect route
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/user/dashboard');
    }
  } else {
    res.redirect('/login');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('volunteer/error', { 
    message: 'Page Not Found', 
    error: { status: 404 } 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
