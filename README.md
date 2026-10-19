# NexPlay

NexPlay is a sports venue booking and community game platform built with Node.js, Express, MongoDB, Mongoose, React, and Vite.

## Features

- User signup and signin
- JWT-based protected routes
- Venue listing and sport filtering
- Venue booking for valid date and slot combinations
- Venue-local (Asia/Kolkata) booking dates and past-slot prevention
- Booking confirmation details and booking/cancellation status history
- Cancellation allowed up to 6 hours before the slot starts
- Duplicate booking protection for concurrent requests
- Community game creation from bookings
- Game join/leave flows
- Real-time chat for joined community-game participants, with unread counts, sender/timestamp labels, paginated history, reconnect handling, and access revocation on leaving a game
- User profile dashboard with bookings and games
- Admin dashboard for venue management, booking history, and community games

## Project structure

- `server.js` – starts the backend server
- `src/app.js` – Express app setup and route mounting
- `src/config/db.js` – MongoDB connection setup
- `src/middlewares` – auth and error middleware
- `src/models` – Mongoose schemas
- `src/routes` – auth, venue, booking, game, and admin route modules
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

Only accounts with the database `admin` role can access the admin dashboard and management API. The role cannot be set through signup. Admins can manage venue details and hourly operating hours, review booking/cancellation history, and delete community games. Removing a venue hides it from public listings without deleting booking history. The dashboard reports booking and game counts; revenue is not available because the platform does not process payments.

## Backend tests

Run `npm test` with a local MongoDB server available. The integration tests create a uniquely named temporary database, verify auth/admin/booking/game flows, and drop that test database afterward. They do not use the application's `NEXPLAY` database.

In production, set `JWT_SECRET` to a random value of at least 32 characters, plus explicit `MONGO_URI` and `FRONTEND_ORIGIN` values. The server will refuse to start if any are missing.

The backend creates unique database indexes to prevent duplicate active venue bookings and duplicate games for one booking. If older database records already violate either rule, startup fails and the duplicates must be reviewed and resolved before the indexes can be created.

## Deploy the backend on Render

Configure the Render web service with:

- Root directory: repository root
- Build command: `npm install`
- Start command: `npm start`
- Environment: `NODE_ENV=production`
- Required environment variables: `MONGO_URI`, `JWT_SECRET` (at least 32 characters), and `FRONTEND_ORIGIN` (the deployed frontend's exact origin)

Do not use `npm run dev` as the Render start command; that runs the development-only nodemon watcher. Render supplies the `PORT` variable automatically.

The backend uses Socket.IO over the same Render web service for game chat. `FRONTEND_ORIGIN` must include each frontend origin allowed to connect (comma-separated, with no paths), including the production Vercel domain and any Vercel preview domain you use.

## Notes

- Authentication currently uses localStorage for the token, per the project requirement.
- This project is designed as an MVP and is ready for feature expansion and production hardening.
