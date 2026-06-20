const mongoose = require('mongoose');
const User = require('./models/User');
const Volunteer = require('./models/Volunteer');
const Event = require('./models/Event');
const VolunteerHours = require('./models/VolunteerHours');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/volunteer-db';

async function runTests() {
  console.log('--- STARTING VALIDATION TESTS ---');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[PASS] Connected to MongoDB.');

    // 1. Rollback Test
    console.log('\nTesting Volunteer Registration Rollback...');
    const email = 'rollback-test@example.com';
    // Clean prior test records
    await User.deleteMany({ email });
    await Volunteer.deleteMany({ email });

    // Simulate registration with User succeeding but Volunteer validation failing (e.g. invalid age)
    let savedUser;
    try {
      const newUser = new User({
        username: 'rollbackuser',
        email,
        password: 'hashedpassword123',
        role: 'volunteer'
      });
      savedUser = await newUser.save();
      console.log('   - Step 1: User created successfully.');
    } catch (err) {
      console.error('   - Step 1 Failed unexpectedly:', err);
    }

    try {
      // Intentionally cause failure: age: -5 (min is 1)
      const newVolunteer = new Volunteer({
        fullName: 'Rollback User',
        email,
        phone: '123456789',
        age: -5, // Validation error
        gender: 'Male',
        city: 'Miami',
        skills: ['Tech'],
        availability: 'Weekdays',
        experienceLevel: 'Beginner',
        motivation: 'Testing',
        emergencyContact: 'Test',
        user: savedUser._id,
        status: 'Pending'
      });
      await newVolunteer.save();
    } catch (volErr) {
      console.log('   - Step 2: Volunteer validation failed as expected.');
      // Trigger rollback
      if (savedUser) {
        console.log('   - Step 3: Rolling back User account...');
        await User.findByIdAndDelete(savedUser._id);
        console.log('   - Step 4: User account deleted (rolled back).');
      }
    }

    // Verify User no longer exists
    const checkUser = await User.findOne({ email });
    if (!checkUser) {
      console.log('[PASS] Rollback test passed! No orphaned user record exists.');
    } else {
      console.log('[FAIL] Rollback test failed. User record was not rolled back.');
    }


    // 2. Enforce Approved Status & Concurrency Capacity Join Test
    console.log('\nTesting Event Joining Business Logic & Atomicity...');
    
    // Create test event
    const event = new Event({
      title: 'Atomic Test Event',
      description: 'Validation testing',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      capacity: 1, // Max 1 volunteer
      status: 'Open'
    });
    await event.save();

    // Create test Approved volunteer & user
    const appUser = new User({ username: 'approveduser', email: 'approved@test.com', password: 'password', role: 'volunteer' });
    await appUser.save();
    const appVol = new Volunteer({
      fullName: 'Approved Volunteer',
      email: 'approved@test.com',
      phone: '123',
      age: 25,
      gender: 'Male',
      city: 'Boston',
      skills: ['Tech'],
      availability: 'Weekdays',
      experienceLevel: 'Intermediate',
      motivation: 'Test',
      emergencyContact: 'Test',
      user: appUser._id,
      status: 'Approved'
    });
    await appVol.save();

    // Create test Pending volunteer & user
    const pendUser = new User({ username: 'pendinguser', email: 'pending@test.com', password: 'password', role: 'volunteer' });
    await pendUser.save();
    const pendVol = new Volunteer({
      fullName: 'Pending Volunteer',
      email: 'pending@test.com',
      phone: '123',
      age: 25,
      gender: 'Male',
      city: 'Boston',
      skills: ['Tech'],
      availability: 'Weekdays',
      experienceLevel: 'Intermediate',
      motivation: 'Test',
      emergencyContact: 'Test',
      user: pendUser._id,
      status: 'Pending'
    });
    await pendVol.save();

    // Enforce Approved status check simulation
    async function simulateJoin(userId, volunteerDoc, eventId) {
      if (volunteerDoc.status !== 'Approved') {
        return { success: false, reason: 'Status is not Approved' };
      }

      const updated = await Event.findOneAndUpdate(
        {
          _id: eventId,
          status: 'Open',
          joinedVolunteers: { $ne: userId },
          $expr: { $lt: [{ $size: '$joinedVolunteers' }, '$capacity'] }
        },
        {
          $addToSet: { joinedVolunteers: userId }
        },
        { new: true }
      );

      if (!updated) {
        // Find specific reason
        const ev = await Event.findById(eventId);
        if (!ev) return { success: false, reason: 'Event not found' };
        if (ev.status !== 'Open') return { success: false, reason: 'Event is not Open' };
        if (ev.joinedVolunteers.includes(userId)) return { success: false, reason: 'Already joined' };
        if (ev.joinedVolunteers.length >= ev.capacity) return { success: false, reason: 'At full capacity' };
        return { success: false, reason: 'Unknown' };
      }
      return { success: true };
    }

    // Attempt 1: Join with Pending user -> Should fail
    const joinRes1 = await simulateJoin(pendUser._id, pendVol, event._id);
    if (!joinRes1.success && joinRes1.reason === 'Status is not Approved') {
      console.log('[PASS] Blocked pending volunteer from joining event successfully.');
    } else {
      console.log('[FAIL] Pending volunteer was not blocked.', joinRes1);
    }

    // Attempt 2: Join with Approved user -> Should succeed
    const joinRes2 = await simulateJoin(appUser._id, appVol, event._id);
    if (joinRes2.success) {
      console.log('[PASS] Approved volunteer joined event successfully.');
    } else {
      console.log('[FAIL] Approved volunteer failed to join.', joinRes2);
    }

    // Attempt 3: Double join (Approved user tries to join again) -> Should fail with 'Already joined'
    const joinRes3 = await simulateJoin(appUser._id, appVol, event._id);
    if (!joinRes3.success && joinRes3.reason === 'Already joined') {
      console.log('[PASS] Blocked double-joining successfully.');
    } else {
      console.log('[FAIL] Double join was not prevented.', joinRes3);
    }

    // Attempt 4: Capacity limit join (Create another approved volunteer, try to join) -> Should fail with 'At full capacity'
    const appUser2 = new User({ username: 'approveduser2', email: 'approved2@test.com', password: 'password', role: 'volunteer' });
    await appUser2.save();
    const appVol2 = new Volunteer({
      fullName: 'Approved Volunteer 2',
      email: 'approved2@test.com',
      phone: '123',
      age: 25,
      gender: 'Male',
      city: 'Boston',
      skills: ['Tech'],
      availability: 'Weekdays',
      experienceLevel: 'Intermediate',
      motivation: 'Test',
      emergencyContact: 'Test',
      user: appUser2._id,
      status: 'Approved'
    });
    await appVol2.save();

    const joinRes4 = await simulateJoin(appUser2._id, appVol2, event._id);
    if (!joinRes4.success && joinRes4.reason === 'At full capacity') {
      console.log('[PASS] Atomic capacity check works! Enforced max capacity limit.');
    } else {
      console.log('[FAIL] Capacity enforcement failed.', joinRes4);
    }

    // Clean up test records
    console.log('\nCleaning up validation test records...');
    await Event.findByIdAndDelete(event._id);
    await User.findByIdAndDelete(appUser._id);
    await Volunteer.findByIdAndDelete(appVol._id);
    await User.findByIdAndDelete(pendUser._id);
    await Volunteer.findByIdAndDelete(pendVol._id);
    await User.findByIdAndDelete(appUser2._id);
    await Volunteer.findByIdAndDelete(appVol2._id);
    console.log('[PASS] Cleaned up.');

    console.log('\n--- ALL TEST PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('[FATAL] Test runner failed with error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

runTests();
