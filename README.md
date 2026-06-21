# NexPlay Backend

A sports venue booking and game matchmaking platform built using Node.js, Express.js, MongoDB, and JWT Authentication.

## Features

### Authentication

* User Signup
* User Signin
* JWT Authentication
* Protected Routes

### Venues

* Create Venue
* View All Venues
* Filter Venues by Sport

### Booking System

* Book Sports Venues
* View Available Slots
* Prevent Double Booking
* View My Bookings
* Cancel Bookings
* Booking allowed only for the next 10 days

### Games

* Create Game
* View Available Games
* Join Game
* Leave Game
* Automatic Player Count Management

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcryptjs

## API Endpoints

### Authentication

```http
POST /api/v1/signup
POST /api/v1/signin
GET /api/v1/me
```

### Venues

```http
POST /api/v1/venues
GET /api/v1/venues
GET /api/v1/venues?sport=Cricket
GET /api/v1/venues/:venueId/slots
```

### Bookings

```http
POST /api/v1/bookings
GET /api/v1/bookings
DELETE /api/v1/bookings/:bookingId
```

### Games

```http
POST /api/v1/games
GET /api/v1/games
POST /api/v1/games/:gameId/join
DELETE /api/v1/games/:gameId/leave
```

## Installation

```bash
git clone <repository-url>
cd nexplay

npm install

npm run dev

## Future Enhancements

* Squad Management
* Team Creation
* Notifications
* Chat System
* Payments
* Ratings and Reviews
* Tournament Management

## Author

Gudi Dedeepya
B.Tech CSE, NIT Durgapur
