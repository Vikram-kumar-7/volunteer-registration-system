const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const VolunteerHours = require('../models/VolunteerHours');
const AuditLog = require('../models/AuditLog');
const nodemailer = require('nodemailer');

module.exports = {
  // GET Admin Dashboard
  getDashboard: async (req, res) => {
    try {
      const totalVolunteers = await Volunteer.countDocuments();
      const activeVolunteers = await Volunteer.countDocuments({ status: 'Approved' });
      const totalEvents = await Event.countDocuments();

      // Sum total volunteer hours worked
      const hoursAgg = await VolunteerHours.aggregate([
        { $group: { _id: null, total: { $sum: '$hoursWorked' } } }
      ]);
      const totalHours = hoursAgg.length > 0 ? hoursAgg[0].total : 0;

      // Calculate completion rate
      const completedCount = await Volunteer.countDocuments({ status: 'Completed' });
      const completionRate = totalVolunteers > 0 ? ((completedCount / totalVolunteers) * 100).toFixed(1) : '0.0';

      // Aggregate skills
      const skillAgg = await Volunteer.aggregate([
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } }
      ]);
      const skillStats = {
        Teaching: 0,
        Medical: 0,
        Tech: 0,
        Construction: 0,
        Cooking: 0,
        Logistics: 0
      };
      skillAgg.forEach(item => {
        if (skillStats.hasOwnProperty(item._id)) {
          skillStats[item._id] = item.count;
        }
      });

      // Aggregate cities
      const cityStats = await Volunteer.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]);

      // Aggregate availability
      const availAgg = await Volunteer.aggregate([
        { $group: { _id: '$availability', count: { $sum: 1 } } }
      ]);
      const availabilityStats = { Weekdays: 0, Weekends: 0, Both: 0 };
      availAgg.forEach(item => {
        if (availabilityStats.hasOwnProperty(item._id)) {
          availabilityStats[item._id] = item.count;
        }
      });

      // Recent 5 registrations
      const recentVolunteers = await Volunteer.find().sort({ createdAt: -1 }).limit(5);

      res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        totalVolunteers,
        activeVolunteers,
        totalEvents,
        totalHours,
        completionRate,
        skillStats,
        cityStats,
        availabilityStats,
        recentVolunteers
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error fetching dashboard data');
      res.redirect('/login');
    }
  },

  // GET Volunteers List with Search & Filters
  getVolunteers: async (req, res) => {
    try {
      const { search, skill, city, availability, status } = req.query;

      // Construct query object
      let query = {};

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } }
        ];
      }

      if (skill) {
        query.skills = skill;
      }

      if (city) {
        query.city = { $regex: `^${city}$`, $options: 'i' };
      }

      if (availability) {
        query.availability = availability;
      }

      if (status) {
        query.status = status;
      }

      const volunteers = await Volunteer.find(query).sort({ createdAt: -1 });

      // Get unique cities for filter dropdown
      const cities = await Volunteer.distinct('city');

      res.render('admin/volunteers', {
        title: 'Manage Volunteers',
        volunteers,
        cities,
        filters: {
          search: search || '',
          skill: skill || '',
          city: city || '',
          availability: availability || '',
          status: status || ''
        }
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error fetching volunteers list');
      res.redirect('/admin/dashboard');
    }
  },

  // GET Volunteer Details
  getVolunteerById: async (req, res) => {
    try {
      const volunteer = await Volunteer.findById(req.params.id);
      if (!volunteer) {
        req.flash('error_msg', 'Volunteer not found');
        return res.redirect('/admin/volunteers');
      }
      res.render('admin/detail', {
        title: `Volunteer Detail - ${volunteer.fullName}`,
        volunteer
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error fetching volunteer details');
      res.redirect('/admin/volunteers');
    }
  },

  // POST Update Volunteer Status (Approve/Reject/Assign/Complete)
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Assigned', 'Completed'];
      if (!validStatuses.includes(status)) {
        req.flash('error_msg', 'Invalid status selected');
        return res.redirect(`/admin/volunteers/${req.params.id}`);
      }

      const volunteer = await Volunteer.findById(req.params.id);
      if (!volunteer) {
        req.flash('error_msg', 'Volunteer not found');
        return res.redirect('/admin/volunteers');
      }

      const oldStatus = volunteer.status;
      volunteer.status = status;
      
      // Log transition history
      volunteer.history.push({
        status: status,
        changedAt: new Date(),
        changedBy: req.user._id
      });
      await volunteer.save();

      // Dispatch Database Notification to Volunteer if user account is linked
      if (volunteer.user) {
        const title = `Application Status Update: ${status}`;
        let message = `Hello ${volunteer.fullName}, your volunteer application status has been updated to "${status}".`;
        if (status === 'Approved') {
          message = `Congratulations ${volunteer.fullName}! Your application has been approved. You can now browse and join events.`;
        } else if (status === 'Completed') {
          message = `Thank you ${volunteer.fullName}! Your volunteer application/engagement has been marked as Completed.`;
        }

        const notification = new Notification({
          userId: volunteer.user,
          title,
          message
        });
        await notification.save();

        // Dispatch Email Alert via Nodemailer (with robust development logger fallback)
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

        const mailOptions = {
          to: volunteer.email,
          from: process.env.EMAIL_USER || 'no-reply@volunteerhub.com',
          subject: `Volunteer Hub - Application Status Updated to ${status}`,
          text: `Hello ${volunteer.fullName},\n\n` +
            `Your volunteer application status has been updated to: "${status}".\n\n` +
            `Log in to your dashboard to view details:\n` +
            `http://${req.headers.host}/login\n\n` +
            `Thank you for volunteering with us!\n`
        };

        // Send email non-blockingly
        transporter.sendMail(mailOptions)
          .then(info => console.log('Email alert sent successfully:', info.messageId))
          .catch(mailErr => console.error('Email alert failed:', mailErr));
      }

      // Log Audit Log
      const audit = new AuditLog({
        action: `Admin updated volunteer "${volunteer.fullName}" status from "${oldStatus}" to "${status}"`,
        performedBy: req.user._id,
        targetId: volunteer._id,
        targetType: 'Volunteer'
      });
      await audit.save();

      req.flash('success_msg', `Volunteer status updated to ${status}`);
      res.redirect(`/admin/volunteers/${req.params.id}`);
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error updating volunteer status');
      res.redirect('/admin/volunteers');
    }
  },

  // DELETE Volunteer
  deleteVolunteer: async (req, res) => {
    try {
      const volunteer = await Volunteer.findByIdAndDelete(req.params.id);
      if (!volunteer) {
        req.flash('error_msg', 'Volunteer not found');
        return res.redirect('/admin/volunteers');
      }

      // Log Audit Log
      const audit = new AuditLog({
        action: `Admin deleted volunteer profile "${volunteer.fullName}"`,
        performedBy: req.user._id,
        targetId: volunteer._id,
        targetType: 'Volunteer'
      });
      await audit.save();

      req.flash('success_msg', 'Volunteer record deleted successfully');
      res.redirect('/admin/volunteers');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error deleting volunteer');
      res.redirect('/admin/volunteers');
    }
  },

  // GET Reports Page
  getReports: async (req, res) => {
    try {
      // 1. Volunteer growth over time (by date)
      const growthAgg = await Volunteer.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Map to accumulation growth
      let runningTotal = 0;
      const volunteerGrowth = growthAgg.map(day => {
        runningTotal += day.count;
        return {
          date: day._id,
          daily: day.count,
          cumulative: runningTotal
        };
      });

      // 2. Skill demand breakdown
      const skillAgg = await Volunteer.aggregate([
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // 3. City-wise count
      const cityCount = await Volunteer.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Fetch all volunteers for CSV export json
      const allVolunteers = await Volunteer.find().sort({ createdAt: -1 });

      res.render('admin/reports', {
        title: 'Analytics Reports',
        volunteerGrowth,
        skillAgg,
        cityCount,
        allVolunteersJSON: JSON.stringify(allVolunteers)
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error generating reports');
      res.redirect('/admin/dashboard');
    }
  },

  // GET Admin Events Management
  getEvents: async (req, res) => {
    try {
      const events = await Event.find().sort({ date: 1 }).populate('joinedVolunteers');
      const volunteers = await Volunteer.find({ status: 'Approved' }).sort({ fullName: 1 });
      const audits = await AuditLog.find().sort({ timestamp: -1 }).limit(20).populate('performedBy');

      res.render('admin/events', {
        title: 'Manage Events',
        events,
        volunteers,
        audits
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error fetching events');
      res.redirect('/admin/dashboard');
    }
  },

  // POST Create New Event
  createEvent: async (req, res) => {
    try {
      const { title, description, date, capacity, status } = req.body;
      
      // Validations
      if (!title || !description || !date || !capacity) {
        req.flash('error_msg', 'All fields are required');
        return res.redirect('/admin/events');
      }

      if (parseInt(capacity, 10) < 1) {
        req.flash('error_msg', 'Capacity must be at least 1');
        return res.redirect('/admin/events');
      }

      if (new Date(date) < new Date()) {
        req.flash('error_msg', 'Event date must be in the future');
        return res.redirect('/admin/events');
      }

      const event = new Event({
        title,
        description,
        date: new Date(date),
        capacity: parseInt(capacity, 10),
        status: status || 'Open'
      });

      await event.save();

      // Log Audit Log
      const audit = new AuditLog({
        action: `Admin created event "${title}"`,
        performedBy: req.user._id,
        targetId: event._id,
        targetType: 'Event'
      });
      await audit.save();

      req.flash('success_msg', `Event "${title}" created successfully!`);
      res.redirect('/admin/events');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error creating event');
      res.redirect('/admin/events');
    }
  },

  // POST Update Event Status Lifecycle
  updateEventStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['Draft', 'Open', 'Closed', 'Completed'];
      
      if (!validStatuses.includes(status)) {
        req.flash('error_msg', 'Invalid status selection');
        return res.redirect('/admin/events');
      }

      const event = await Event.findById(req.params.id);
      if (!event) {
        req.flash('error_msg', 'Event not found');
        return res.redirect('/admin/events');
      }

      const oldStatus = event.status;
      event.status = status;
      await event.save();

      // Log Audit Log
      const audit = new AuditLog({
        action: `Admin updated event "${event.title}" status from "${oldStatus}" to "${status}"`,
        performedBy: req.user._id,
        targetId: event._id,
        targetType: 'Event'
      });
      await audit.save();

      req.flash('success_msg', `Event status updated to "${status}"`);
      res.redirect('/admin/events');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error updating event status');
      res.redirect('/admin/events');
    }
  },

  // POST Delete Event
  deleteEvent: async (req, res) => {
    try {
      const event = await Event.findByIdAndDelete(req.params.id);
      if (!event) {
        req.flash('error_msg', 'Event not found');
        return res.redirect('/admin/events');
      }

      // Log Audit Log
      const audit = new AuditLog({
        action: `Admin deleted event "${event.title}"`,
        performedBy: req.user._id,
        targetId: event._id,
        targetType: 'Event'
      });
      await audit.save();

      req.flash('success_msg', `Event "${event.title}" deleted successfully.`);
      res.redirect('/admin/events');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error deleting event');
      res.redirect('/admin/events');
    }
  },

  // POST Log Volunteer Hours worked on an event
  logHours: async (req, res) => {
    try {
      const { volunteerId, hoursWorked } = req.body;
      const eventId = req.params.id;

      if (!volunteerId || !hoursWorked) {
        req.flash('error_msg', 'All fields are required');
        return res.redirect('/admin/events');
      }

      if (parseFloat(hoursWorked) < 0) {
        req.flash('error_msg', 'Hours worked cannot be negative');
        return res.redirect('/admin/events');
      }

      const event = await Event.findById(eventId);
      if (!event) {
        req.flash('error_msg', 'Event not found');
        return res.redirect('/admin/events');
      }

      // Find user to log hours (volunteerId is user id in the database)
      const user = await User.findById(volunteerId);
      if (!user) {
        req.flash('error_msg', 'User/Volunteer not found');
        return res.redirect('/admin/events');
      }

      // Log/Update Hours (upsert)
      const hourRecord = await VolunteerHours.findOneAndUpdate(
        { volunteerId: user._id, eventId: event._id },
        { hoursWorked: parseFloat(hoursWorked) },
        { upsert: true, new: true }
      );

      // Create Notification for volunteer
      const notification = new Notification({
        userId: user._id,
        title: 'Volunteer Hours Logged',
        message: `Admin has registered ${hoursWorked} hours for you on the event "${event.title}".`
      });
      await notification.save();

      // Log Audit Log
      const audit = new AuditLog({
        action: `Admin logged ${hoursWorked} hours for volunteer "${user.username}" on event "${event.title}"`,
        performedBy: req.user._id,
        targetId: hourRecord._id,
        targetType: 'VolunteerHours'
      });
      await audit.save();

      req.flash('success_msg', `Successfully logged ${hoursWorked} hours for ${user.username}.`);
      res.redirect('/admin/events');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error registering hours');
      res.redirect('/admin/events');
    }
  }
};
