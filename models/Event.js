const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['Draft', 'Open', 'Closed', 'Completed'],
    default: 'Open'
  },
  joinedVolunteers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Event', EventSchema);
