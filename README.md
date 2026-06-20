# volunteer-registration-system
Volunteer Registration &amp; Management System  Full-stack platform (Node.js, Express, MongoDB, EJS, Passport.js) with role-based access, event lifecycle management, and admin approval workflows. Secured with session auth, bcrypt, Helmet, and rate limiting. Includes automated tests for rollback safety, access control, and event capacity limits.
# Volunteer Registration & Management System

A full-stack, SaaS-style platform for managing volunteer registration, event campaigns, and admin workflows — built with Node.js, Express, MongoDB, and EJS server-side rendering.

## Overview

VolunteerHub lets organizations publish volunteering events, accept and review volunteer applications, track logged hours, and manage the full lifecycle of campaigns — from `Draft` to `Completed` — through a secure, role-based dashboard.

## Features

- **Role-based access control** — separate experiences for `admin` and `volunteer` roles
- **Volunteer profiles** — skills, availability, city, experience level, and application history
- **Event lifecycle management** — `Draft → Open → Closed → Completed`, with capacity limits
- **Admin approval workflow** — approve/reject volunteer applications with audit logging
- **Hours tracking** — log and review volunteer hours per event
- **In-app notifications** — status alerts for applications and events
- **Email alerts** — via Nodemailer for status changes
- **Admin analytics** — dashboard stats on availability breakdowns and skill trends

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose ODM) |
| Templating | EJS |
| Auth | Passport.js (local strategy), express-session |
| Security | Helmet, express-rate-limit, express-mongo-sanitize, bcryptjs |
| Validation | express-validator |
| File Uploads | Multer (profile pictures) |
| Email | Nodemailer |

## Project Structure

```
volunteer-system/
├── config/
│   ├── db.js              # MongoDB connection handler
│   └── passport.js        # Passport local strategy config
├── controllers/
│   ├── authController.js
│   ├── volunteerController.js
│   ├── userController.js
│   └── adminController.js
├── middleware/
│   └── auth.js            # ensureAuthenticated, ensureAdmin, ensureVolunteer guards
├── models/
│   ├── User.js
│   ├── Volunteer.js
│   ├── Event.js
│   ├── VolunteerHours.js
│   ├── Notification.js
│   └── AuditLog.js
├── routes/
│   ├── auth.js
│   ├── volunteer.js
│   ├── user.js
│   └── admin.js
├── seed.js                # Seeds demo data (events, volunteers, hours, admin user)
├── test_user_flows.js     # Validation tests
├── server.js              # App entry point
└── style.css
```

## Security

- Session-based authentication via Passport.js with bcrypt password hashing
- HTTP header hardening via Helmet
- Rate limiting to mitigate brute-force and DoS attempts
- NoSQL injection protection via `express-mongo-sanitize`
- Server-side validation on all form inputs (`express-validator`)

## Getting Started

### Prerequisites

- Node.js
- MongoDB running locally on `mongodb://localhost:27017/volunteer-db`

### Installation

```bash
npm install
```

### Seed the database with demo data

```bash
node seed.js
```

### Run the validation test suite

```bash
node test_user_flows.js
```

Tests cover:
1. Atomic rollback if volunteer profile creation fails after the credentials user is written
2. Access control preventing unapproved/pending volunteers from joining events
3. Capacity limits preventing registration once an event reaches its cap

### Start the development server

```bash
npm run dev
```

## License

This project is for educational and portfolio purposes.
