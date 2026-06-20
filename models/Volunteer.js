const mongoose = require('mongoose');

const VolunteerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 1
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  skills: {
    type: [String],
    required: true,
    enum: ['Teaching', 'Medical', 'Tech', 'Construction', 'Cooking', 'Logistics']
  },
  availability: {
    type: String,
    required: true,
    enum: ['Weekdays', 'Weekends', 'Both']
  },
  experienceLevel: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  motivation: {
    type: String,
    required: true,
    trim: true
  },
  emergencyContact: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  profilePicture: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Assigned', 'Completed'],
    default: 'Pending'
  },
  history: [{
    status: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Volunteer', VolunteerSchema);
