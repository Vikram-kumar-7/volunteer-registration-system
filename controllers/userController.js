const Volunteer = require('../models/Volunteer');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const VolunteerHours = require('../models/VolunteerHours');

module.exports = {
  // GET User Dashboard
  getDashboard: async (req, res) => {
    try {
      let volunteer = await Volunteer.findOne({ user: req.user._id });
      if (!volunteer) {
        // Fallback for volunteer account with missing profile
        volunteer = new Volunteer({
          fullName: req.user.username,
          email: req.user.email,
          phone: 'Please update phone',
          age: 18,
          gender: 'Other',
          city: 'Please update city',
          skills: [],
          availability: 'Both',
          experienceLevel: 'Beginner',
          motivation: 'N/A',
          emergencyContact: 'N/A',
          user: req.user._id,
          status: 'Pending'
        });
        await volunteer.save();
      }

      const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
      const openEvents = await Event.find({ status: 'Open' }).limit(5);
      const joinedEvents = await Event.find({ joinedVolunteers: req.user._id });
      
      const hoursRecord = await VolunteerHours.find({ volunteerId: req.user._id });
      const totalHours = hoursRecord.reduce((sum, h) => sum + h.hoursWorked, 0);
      const eventsCount = hoursRecord.length;

      res.render('user/dashboard', {
        title: 'Volunteer Dashboard',
        user: req.user,
        volunteer,
        notifications,
        openEvents,
        joinedEvents,
        totalHours,
        eventsCount
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error fetching dashboard metrics');
      res.redirect('/login');
    }
  },

  // GET User Profile
  getProfile: async (req, res) => {
    try {
      const volunteer = await Volunteer.findOne({ user: req.user._id });
      res.render('user/profile', {
        title: 'My Profile',
        volunteer,
        skillsList: ['Teaching', 'Medical', 'Tech', 'Construction', 'Cooking', 'Logistics']
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error loading profile settings');
      res.redirect('/user/dashboard');
    }
  },

  // POST Update User Profile
  updateProfile: async (req, res) => {
    try {
      const { phone, city, skills, availability, experienceLevel, emergencyContact, motivation } = req.body;
      const formattedSkills = Array.isArray(skills) ? skills : (skills ? [skills] : []);

      await Volunteer.findOneAndUpdate(
        { user: req.user._id },
        { 
          phone, 
          city,
          skills: formattedSkills,
          availability,
          experienceLevel,
          emergencyContact,
          motivation
        },
        { new: true }
      );

      req.flash('success_msg', 'Profile updated successfully!');
      res.redirect('/user/profile');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Failed to update profile settings');
      res.redirect('/user/profile');
    }
  },

  // POST Upload Profile Picture
  uploadProfilePicture: async (req, res) => {
    try {
      if (!req.file) {
        req.flash('error_msg', 'Please select an image file to upload.');
        return res.redirect('/user/profile');
      }

      const imagePath = `/uploads/${req.file.filename}`;
      await Volunteer.findOneAndUpdate(
        { user: req.user._id },
        { profilePicture: imagePath }
      );

      req.flash('success_msg', 'Profile picture updated successfully!');
      res.redirect('/user/profile');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error uploading profile picture');
      res.redirect('/user/profile');
    }
  },

  // GET Application Tracking
  getApplicationStatus: async (req, res) => {
    try {
      const volunteer = await Volunteer.findOne({ user: req.user._id });
      res.render('user/application', {
        title: 'Track Application',
        volunteer
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error loading application tracker');
      res.redirect('/user/dashboard');
    }
  },

  // GET Activity History
  getHistory: async (req, res) => {
    try {
      const volunteer = await Volunteer.findOne({ user: req.user._id });
      const hours = await VolunteerHours.find({ volunteerId: req.user._id }).populate('eventId');
      const joinedEvents = await Event.find({ joinedVolunteers: req.user._id }).sort({ date: -1 });

      res.render('user/history', {
        title: 'Activity History',
        volunteer,
        hours,
        joinedEvents
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error loading activity history');
      res.redirect('/user/dashboard');
    }
  },

  // GET Events Grid
  getEvents: async (req, res) => {
    try {
      const events = await Event.find({ status: { $ne: 'Draft' } }).sort({ date: 1 });
      const volunteer = await Volunteer.findOne({ user: req.user._id });

      res.render('user/events', {
        title: 'Volunteer Events',
        events,
        volunteer
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error loading events list');
      res.redirect('/user/dashboard');
    }
  },

  // POST Join Event
  joinEvent: async (req, res) => {
    try {
      // 1. Enforce that volunteer is Approved
      const volunteer = await Volunteer.findOne({ user: req.user._id });
      if (!volunteer || volunteer.status !== 'Approved') {
        req.flash('error_msg', 'Your application must be Approved before you can join events.');
        return res.redirect('/user/events');
      }

      // 2. Perform atomic join using findOneAndUpdate with capacity and double-join filters
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: req.params.id,
          status: 'Open',
          joinedVolunteers: { $ne: req.user._id },
          $expr: { $lt: [{ $size: '$joinedVolunteers' }, '$capacity'] }
        },
        {
          $addToSet: { joinedVolunteers: req.user._id }
        },
        { new: true }
      );

      if (!updatedEvent) {
        // Find specific reason for failure
        const event = await Event.findById(req.params.id);
        if (!event) {
          req.flash('error_msg', 'Event not found');
        } else if (event.status !== 'Open') {
          req.flash('error_msg', 'This event is not open for registration.');
        } else if (event.joinedVolunteers.includes(req.user._id)) {
          req.flash('error_msg', 'You have already joined this event.');
        } else if (event.joinedVolunteers.length >= event.capacity) {
          req.flash('error_msg', 'This event has reached full capacity.');
        } else {
          req.flash('error_msg', 'Unable to join event.');
        }
        return res.redirect('/user/events');
      }

      // Dispatch Notification
      const notification = new Notification({
        userId: req.user._id,
        title: 'Joined Event Successfully',
        message: `Congratulations! You have joined the event "${updatedEvent.title}" on ${new Date(updatedEvent.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}.`
      });
      await notification.save();

      req.flash('success_msg', 'Successfully joined the event!');
      res.redirect('/user/events');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error occurred joining the event');
      res.redirect('/user/events');
    }
  },

  // POST Mark Notification as Read
  markNotificationRead: async (req, res) => {
    try {
      await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isRead: true }
      );
      res.redirect('back');
    } catch (err) {
      console.error(err);
      res.redirect('back');
    }
  }
};
