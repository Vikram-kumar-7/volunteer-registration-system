const mongoose = require('mongoose');

const VolunteerHoursSchema = new mongoose.Schema({
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  hoursWorked: {
    type: Number,
    required: true,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce unique combination of volunteer & event for hours tracked
VolunteerHoursSchema.index({ volunteerId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('VolunteerHours', VolunteerHoursSchema);
