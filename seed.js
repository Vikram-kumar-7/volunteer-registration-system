require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Volunteer = require('./models/Volunteer');
const Event = require('./models/Event');
const VolunteerHours = require('./models/VolunteerHours');
const AuditLog = require('./models/AuditLog');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/volunteer-db';

const seedData = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Clean Database
    console.log('Cleaning collections...');
    await User.deleteMany({ role: { $ne: 'admin' } });
    await Volunteer.deleteMany({});
    await Event.deleteMany({});
    await VolunteerHours.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Collections cleaned.');

    // 2. Seed Admin User
    const existingAdmin = await User.findOne({ role: 'admin' });
    let adminId;
    if (!existingAdmin) {
      console.log('Seeding default Admin user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      const savedAdmin = await adminUser.save();
      adminId = savedAdmin._id;
      console.log('Admin user created successfully (username: admin, password: password123).');
    } else {
      adminId = existingAdmin._id;
      console.log('Admin user already exists.');
    }

    // Hash default password for seeded volunteers
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('password123', salt);

    // 3. Mock Volunteers data
    const mockVolunteers = [
      {
        fullName: 'Alice Johnson',
        email: 'alice.j@example.com',
        phone: '123-456-7890',
        age: 28,
        gender: 'Female',
        city: 'New York',
        skills: ['Teaching', 'Cooking'],
        availability: 'Weekends',
        experienceLevel: 'Intermediate',
        motivation: 'I love teaching young students and cooking for community tables.',
        emergencyContact: 'Bob Johnson (Father) - 123-555-7890',
        status: 'Approved',
        daysAgo: 14
      },
      {
        fullName: 'Bob Smith',
        email: 'bob.smith@example.com',
        phone: '234-567-8901',
        age: 34,
        gender: 'Male',
        city: 'Los Angeles',
        skills: ['Tech', 'Logistics'],
        availability: 'Weekdays',
        experienceLevel: 'Advanced',
        motivation: 'Interested in providing tech support for NGOs and managing warehouse logistics.',
        emergencyContact: 'Carla Smith (Wife) - 234-555-8901',
        status: 'Approved',
        daysAgo: 13
      },
      {
        fullName: 'Charlie Brown',
        email: 'charlie.b@example.com',
        phone: '345-678-9012',
        age: 22,
        gender: 'Other',
        city: 'Chicago',
        skills: ['Construction', 'Logistics'],
        availability: 'Both',
        experienceLevel: 'Beginner',
        motivation: 'Hoping to gain practical construction skills and help build community gardens.',
        emergencyContact: 'Sally Brown (Sister) - 345-555-9012',
        status: 'Pending',
        daysAgo: 11
      },
      {
        fullName: 'Diana Prince',
        email: 'diana.prince@example.com',
        phone: '456-789-0123',
        age: 31,
        gender: 'Female',
        city: 'Houston',
        skills: ['Medical', 'Teaching'],
        availability: 'Both',
        experienceLevel: 'Advanced',
        motivation: 'First-aid trainer looking to assist in medical camps and support children.',
        emergencyContact: 'Hippolyta Prince (Mother) - 456-555-0123',
        status: 'Approved',
        daysAgo: 10
      },
      {
        fullName: 'Evan Wright',
        email: 'evan.w@example.com',
        phone: '567-890-1234',
        age: 45,
        gender: 'Male',
        city: 'Phoenix',
        skills: ['Construction', 'Cooking'],
        availability: 'Weekends',
        experienceLevel: 'Intermediate',
        motivation: 'Experienced in carpentry, glad to help build housing solutions or cook food.',
        emergencyContact: 'Fiona Wright (Spouse) - 567-555-1234',
        status: 'Rejected',
        daysAgo: 8
      },
      {
        fullName: 'Fiona Gallagher',
        email: 'fiona.g@example.com',
        phone: '678-901-2345',
        age: 26,
        gender: 'Female',
        city: 'Chicago',
        skills: ['Cooking', 'Teaching'],
        availability: 'Weekdays',
        experienceLevel: 'Intermediate',
        motivation: 'Looking to serve meals and manage learning programs for kids.',
        emergencyContact: 'Lip Gallagher (Brother) - 678-555-2345',
        status: 'Approved',
        daysAgo: 7
      },
      {
        fullName: 'George Harrison',
        email: 'george.h@example.com',
        phone: '789-012-3456',
        age: 50,
        gender: 'Male',
        city: 'New York',
        skills: ['Tech', 'Teaching'],
        availability: 'Weekdays',
        experienceLevel: 'Advanced',
        motivation: 'Retired IT specialist wishing to run coding workshops for youth.',
        emergencyContact: 'Olivia Harrison (Wife) - 789-555-3456',
        status: 'Completed',
        daysAgo: 6
      }
    ];

    console.log('Seeding volunteers and users...');
    const seededVolunteers = [];
    const approvedUserIds = [];

    for (const data of mockVolunteers) {
      const { daysAgo, ...rest } = data;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      // Create linked User document
      const user = new User({
        username: rest.fullName.replace(/\s+/g, '').toLowerCase(),
        email: rest.email.toLowerCase(),
        password: defaultHashedPassword,
        role: 'volunteer',
        createdAt
      });
      const savedUser = await user.save();

      if (rest.status === 'Approved' || rest.status === 'Completed') {
        approvedUserIds.push(savedUser._id);
      }

      // Create Volunteer Document
      const volunteer = new Volunteer({
        ...rest,
        user: savedUser._id,
        createdAt,
        history: [{
          status: rest.status,
          changedAt: createdAt,
          changedBy: adminId
        }]
      });

      await volunteer.save();
      seededVolunteers.push(volunteer);
    }
    console.log(`Seeded ${seededVolunteers.length} volunteer and user accounts.`);

    // 4. Seed Events
    console.log('Seeding events...');
    const eventsData = [
      {
        title: 'Tree Plantation Campaign',
        description: 'Planting native trees in urban parks to improve biodiversity and combat climate change.',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        capacity: 10,
        status: 'Completed',
        joinedVolunteers: [approvedUserIds[0], approvedUserIds[1], approvedUserIds[2]] // Alice, Bob, Diana
      },
      {
        title: 'Community Kitchen Meal Prep',
        description: 'Prepare, package, and distribute nutritious meals to homeless shelters and vulnerable families.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days in future
        capacity: 15,
        status: 'Open',
        joinedVolunteers: [approvedUserIds[0], approvedUserIds[3]] // Alice, Fiona
      },
      {
        title: 'Youth Coding Bootcamp Mentor',
        description: 'Support high school students learning HTML, CSS, and basic JavaScript in our weekly coding lab.',
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days in future
        capacity: 5,
        status: 'Open',
        joinedVolunteers: [approvedUserIds[1]] // Bob
      },
      {
        title: 'Emergency Flood Relief Prep',
        description: 'Assemble first-aid and sanitation packages for communities affected by recent floods.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        capacity: 40,
        status: 'Draft',
        joinedVolunteers: []
      }
    ];

    const seededEvents = [];
    for (const e of eventsData) {
      const event = new Event(e);
      const savedEvent = await event.save();
      seededEvents.push(savedEvent);
    }
    console.log(`Seeded ${seededEvents.length} events.`);

    // 5. Seed Volunteer Hours
    console.log('Seeding volunteer hours...');
    // Log hours worked on the completed tree plantation campaign
    const completedEvent = seededEvents[0];
    const volunteerHoursData = [
      {
        volunteerId: approvedUserIds[0], // Alice
        eventId: completedEvent._id,
        hoursWorked: 4.5,
        createdAt: completedEvent.date
      },
      {
        volunteerId: approvedUserIds[1], // Bob
        eventId: completedEvent._id,
        hoursWorked: 3.0,
        createdAt: completedEvent.date
      },
      {
        volunteerId: approvedUserIds[2], // Diana
        eventId: completedEvent._id,
        hoursWorked: 5.5,
        createdAt: completedEvent.date
      }
    ];

    for (const h of volunteerHoursData) {
      const volHours = new VolunteerHours(h);
      await volHours.save();
    }
    console.log('Volunteer hours seeded successfully.');

    // 6. Seed initial audit log entries
    console.log('Seeding initial audit logs...');
    const auditLogsData = [
      {
        action: 'Admin created event "Tree Plantation Campaign"',
        performedBy: adminId,
        targetId: seededEvents[0]._id,
        targetType: 'Event'
      },
      {
        action: 'Admin created event "Community Kitchen Meal Prep"',
        performedBy: adminId,
        targetId: seededEvents[1]._id,
        targetType: 'Event'
      },
      {
        action: 'Admin created event "Youth Coding Bootcamp Mentor"',
        performedBy: adminId,
        targetId: seededEvents[2]._id,
        targetType: 'Event'
      },
      {
        action: 'Admin approved volunteer "Alice Johnson"',
        performedBy: adminId,
        targetId: seededVolunteers[0]._id,
        targetType: 'Volunteer'
      },
      {
        action: 'Admin approved volunteer "Bob Smith"',
        performedBy: adminId,
        targetId: seededVolunteers[1]._id,
        targetType: 'Volunteer'
      },
      {
        action: 'Admin logged 4.5 hours for volunteer "alicejohnson" on event "Tree Plantation Campaign"',
        performedBy: adminId,
        targetId: approvedUserIds[0],
        targetType: 'VolunteerHours'
      }
    ];

    for (const log of auditLogsData) {
      const audit = new AuditLog(log);
      await audit.save();
    }
    console.log('Audit logs seeded.');

    console.log('Seeding completed successfully!');
    mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
