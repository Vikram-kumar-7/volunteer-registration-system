const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Apply admin access middleware to all routes in this router
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// Admin Dashboard
router.get('/dashboard', adminController.getDashboard);

// Volunteers list view with search & filters
router.get('/volunteers', adminController.getVolunteers);

// Individual Volunteer details view
router.get('/volunteers/:id', adminController.getVolunteerById);

// Update status (Approve/Reject)
router.post('/volunteers/:id/status', adminController.updateStatus);

// Delete Volunteer record
router.delete('/volunteers/:id', adminController.deleteVolunteer);

// Manage Events listing & creation
router.get('/events', adminController.getEvents);
router.post('/events', adminController.createEvent);

// Update event status
router.post('/events/:id/status', adminController.updateEventStatus);

// Delete Event
router.post('/events/:id/delete', adminController.deleteEvent);

// Register Volunteer Hours worked on an event
router.post('/events/:id/hours', adminController.logHours);

// Reports and Analytics
router.get('/reports', adminController.getReports);

module.exports = router;
