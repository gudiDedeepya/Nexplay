# NexPlay

NexPlay is a sports venue booking and community game platform built with Node.js, Express, MongoDB, Mongoose, React, and Vite.

## Features

- User signup and signin
- JWT-based protected routes
- Venue listing and sport filtering
- Venue booking for valid date and slot combinations
- Booking cancellation
- Community game creation from bookings
- Game join/leave flows
- User profile dashboard with bookings and games

## Project structure

- `server.js` – starts the backend server
- `src/app.js` – Express app setup and route mounting
- `src/config/db.js` – MongoDB connection setup
- `src/middlewares` – auth and error middleware
- `src/models` – Mongoose schemas
- `src/routes` – auth, venue, booking, and game route modules
- `frontend/` – Vite React frontend app

## Environment variables

Copy `.env.example` to `.env` and update values before running the backend.

Example:
Frontend configuration:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## Run locally

Backend:

```bash
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Admin access

Create a normal account first, then promote it using the backend environment's MongoDB connection:

```bash
npm run admin:promote -- admin@example.com
```

Only accounts with the database `admin` role can create venues through the API. The role cannot be set through signup.

## Backend tests

Run `npm test` with a local MongoDB server available. The integration tests create a uniquely named temporary database, verify auth/admin/booking/game flows, and drop that test database afterward. They do not use the application's `NEXPLAY` database.

In production, set `JWT_SECRET` to a random value of at least 32 characters, plus explicit `MONGO_URI` and `FRONTEND_ORIGIN` values. The server will refuse to start if any are missing.

The backend creates unique database indexes to prevent duplicate active venue bookings and duplicate games for one booking. If older database records already violate either rule, startup fails and the duplicates must be reviewed and resolved before the indexes can be created.

## Notes

- Authentication currently uses localStorage for the token, per the project requirement.
- This project is designed as an MVP and is ready for feature expansion and production hardening.
