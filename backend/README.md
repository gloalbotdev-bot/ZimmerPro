# ZimmerPro Backend API

Backend Node.js/Express server for the ZimmerPro management system.

## Project Structure

```
backend/
├── models/              # Mongoose Schemas
│   ├── User.js
│   ├── Account.js
│   ├── Unit.js
│   ├── Booking.js
│   ├── Contact.js
│   ├── Facility.js
│   ├── Review.js
│   └── Room.js
│
├── routes/              # API Routes
│   ├── auth.js
│   ├── users.js
│   ├── units.js
│   ├── bookings.js
│   ├── accounts.js
│   ├── contacts.js
│   ├── facilities.js
│   ├── reviews.js
│   └── rooms.js
│
├── middleware/          # Express Middleware
│   ├── auth.js
│   └── errorHandler.js
│
├── config/              # Configuration files
│   └── database.js
│
├── .env.example         # Environment variables template
├── index.js             # Main server file
└── package.json
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection string and other settings.

### 3. Run the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

See individual route files for full API documentation.

## License

ISC
