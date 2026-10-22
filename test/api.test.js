import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { io as connectSocket } from "socket.io-client";
import { bookingModel } from "../src/models/booking.js";
import { chatMessageModel } from "../src/models/chatMessage.js";
import { gameModel } from "../src/models/game.js";
import { userModel } from "../src/models/user.js";
import { venueModel } from "../src/models/venue.js";
import { validateRuntimeConfig } from "../src/config/security.js";
import { attachChatServer } from "../src/realtime/chatServer.js";
import {
  dateKeyInTimeZone,
  dateRangeForBooking,
  minutesInTimeZone,
  slotStartInTimeZone
} from "../src/utils/bookingDates.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "nexplay-test-secret-with-sufficient-length";

const databaseName = `NEXPLAY_TEST_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/NEXPLAY");
databaseUrl.pathname = `/${databaseName}`;

let baseUrl;
let server;

function tokenFor(userId) {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });
}

async function createUser(email, role = "user") {
  return userModel.create({
    name: "Test Player",
    email,
    password: await bcrypt.hash("ValidPass123", 4),
    role
  });
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers
  };
}

before(async () => {
  await mongoose.connect(databaseUrl.toString());
  await Promise.all([
    userModel.syncIndexes(),
    venueModel.syncIndexes(),
    bookingModel.syncIndexes(),
    gameModel.syncIndexes(),
    chatMessageModel.syncIndexes()
  ]);

  const { default: app, allowedOrigins } = await import("../src/app.js");
  server = createServer(app);
  attachChatServer(server, allowedOrigins);
  server.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/api/v1`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test("signup validates input, creates users, and rejects duplicate emails", async () => {
  const invalid = await request("/signup", {
    method: "POST",
    body: { name: "", email: "not-an-email", password: "short" }
  });
  assert.equal(invalid.status, 400);

  const email = `signup-${randomUUID()}@example.test`;
  const signup = await request("/signup", {
    method: "POST",
    body: {
      name: "Signup Player",
      email,
      password: "ValidPass123",
      location: "Test location",
      role: "admin"
    }
  });
  assert.equal(signup.status, 202);
  assert.equal(signup.body.message, "If account creation was possible, you can now sign in.");
  assert.equal((await userModel.findOne({ email })).role, "user");
  assert.equal(userModel.collection.name, "users");

  const duplicate = await request("/signup", {
    method: "POST",
    body: {
      name: "Signup Player",
      email,
      password: "ValidPass123"
    }
  });
  assert.equal(duplicate.status, 202);
  assert.equal(duplicate.body.message, signup.body.message);

  const signin = await request("/signin", {
    method: "POST",
    body: { email, password: "ValidPass123" }
  });
  assert.equal(signin.status, 200);
  const claims = jwt.decode(signin.body.token);
  assert.equal(claims.exp - claims.iat, 60 * 60);
  const wrongPassword = await request("/signin", {
    method: "POST",
    body: { email, password: "WrongPass123" }
  });
  const unknownEmail = await request("/signin", {
    method: "POST",
    body: { email: `unknown-${randomUUID()}@example.test`, password: "WrongPass123" }
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.equal(wrongPassword.body.message, unknownEmail.body.message);
  assert.equal((await request("/me", { token: signin.body.token })).status, 200);
  assert.equal((await request("/me")).status, 401);
});

test("Helmet sets browser security headers", async () => {
  const health = await request("/health");
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
});

test("signup requires stronger passwords and sign-in attempts are rate limited", async () => {
  const weakSignup = await request("/signup", {
    method: "POST",
    body: { name: "Weak Password", email: `weak-${randomUUID()}@example.test`, password: "short" }
  });
  assert.equal(weakSignup.status, 400);

  let lastResponse;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    lastResponse = await request("/signin", {
      method: "POST",
      body: { email: `unknown-${attempt}-${randomUUID()}@example.test`, password: "WrongPass123" }
    });
  }
  assert.equal(lastResponse.status, 429);
});

test("venue creation requires an administrator account", async () => {
  const regularUser = await createUser(`member-${randomUUID()}@example.test`);
  const adminUser = await createUser(`admin-${randomUUID()}@example.test`, "admin");
  const venueData = {
    name: "Test Court",
    sport: "Badminton",
    location: "Test city",
    pricePerHour: 500
  };

  const forbidden = await request("/admin/venues", {
    method: "POST",
    token: tokenFor(regularUser._id),
    body: venueData
  });
  assert.equal(forbidden.status, 403);

  const created = await request("/admin/venues", {
    method: "POST",
    token: tokenFor(adminUser._id),
    body: venueData
  });
  assert.equal(created.status, 201);
  assert.equal((await request("/venues", { method: "POST", token: tokenFor(adminUser._id), body: venueData })).status, 404);
});

test("admin dashboard and venue management require admin access and honor venue hours", async () => {
  const regularUser = await createUser(`admin-access-${randomUUID()}@example.test`);
  const adminUser = await createUser(`venue-manager-${randomUUID()}@example.test`, "admin");
  assert.equal((await request("/admin/dashboard")).status, 401);
  assert.equal(
    (await request("/admin/dashboard", { token: tokenFor(regularUser._id) })).status,
    403
  );

  const venueResponse = await request("/admin/venues", {
    method: "POST",
    token: tokenFor(adminUser._id),
    body: {
      name: "Hours Test Court",
      sport: "Tennis",
      location: "Test city",
      pricePerHour: 400,
      operatingHours: { open: "18:00", close: "20:00" }
    }
  });
  assert.equal(venueResponse.status, 201);
  const venuePage = await request("/admin/venues?limit=1", {
    token: tokenFor(adminUser._id)
  });
  assert.equal(venuePage.status, 200);
  assert.equal(venuePage.body.venues.length, 1);
  assert.ok(venuePage.body.pagination.totalItems >= 1);
  const venueId = venueResponse.body.venue._id;

  const updatedVenue = await request(`/admin/venues/${venueId}`, {
    method: "PUT",
    token: tokenFor(adminUser._id),
    body: {
      name: "Hours Test Court",
      sport: "Tennis",
      location: "Updated test city",
      pricePerHour: 450,
      operatingHours: { open: "18:00", close: "20:00" }
    }
  });
  assert.equal(updatedVenue.status, 200);
  assert.equal(updatedVenue.body.venue.pricePerHour, 450);

  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 2);
  const day = bookingDate.toISOString().slice(0, 10);
  const beforeOpen = await request("/bookings", {
    method: "POST",
    token: tokenFor(regularUser._id),
    body: { venueId, bookingDate: day, slot: "16:00-17:00" }
  });
  assert.equal(beforeOpen.status, 400);

  const booking = await request("/bookings", {
    method: "POST",
    token: tokenFor(regularUser._id),
    body: { venueId, bookingDate: day, slot: "18:00-19:00" }
  });
  assert.equal(booking.status, 201);

  const slots = await request(`/venues/${venueId}/slots?date=${day}`);
  assert.equal(slots.status, 200);
  assert.deepEqual(slots.body.availableSlots, ["19:00-20:00"]);

  const dashboard = await request("/admin/dashboard", { token: tokenFor(adminUser._id) });
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.metrics.revenueTracked, false);
  assert.equal(dashboard.body.metrics.activeBookings, 1);
  assert.ok(dashboard.body.metrics.venueCount >= 2);

  const history = await request("/admin/bookings", { token: tokenFor(adminUser._id) });
  assert.equal(history.status, 200);
  assert.equal(history.body.bookings.length, 1);
  assert.equal(history.body.pagination.totalItems, 1);
  assert.equal((await request("/admin/bookings?limit=51", { token: tokenFor(adminUser._id) })).status, 400);
  assert.equal(history.body.bookings[0].userId.email, regularUser.email);
  const adminGames = await request("/admin/games?limit=1", { token: tokenFor(adminUser._id) });
  assert.equal(adminGames.status, 200);
  assert.equal(adminGames.body.pagination.limit, 1);

  const deactivated = await request(`/admin/venues/${venueId}`, {
    method: "DELETE",
    token: tokenFor(adminUser._id)
  });
  assert.equal(deactivated.status, 200);
  const publicVenues = await request("/venues");
  assert.equal(publicVenues.body.venues.some((venue) => venue._id === venueId), false);
  assert.equal(await bookingModel.countDocuments({ venueId }), 1);
});

test("venue discovery filters by text, price, and available date and slot", async () => {
  const player = await createUser(`discovery-${randomUUID()}@example.test`);
  const venue = await venueModel.create({
    name: "Riverside Sports Court",
    sport: "Tennis",
    location: "Tirupati",
    pricePerHour: 500,
    operatingHours: { open: "16:00", close: "20:00" }
  });
  const otherVenue = await venueModel.create({
    name: "Hilltop Court",
    sport: "Tennis",
    location: "Other city",
    pricePerHour: 900,
    operatingHours: { open: "16:00", close: "20:00" }
  });
  await venueModel.create([
    {
      name: "Pagination Test Court A",
      sport: "Tennis",
      location: "Test city",
      pricePerHour: 300
    },
    {
      name: "Pagination Test Court B",
      sport: "Tennis",
      location: "Test city",
      pricePerHour: 350
    }
  ]);
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 2);
  const date = bookingDate.toISOString().slice(0, 10);
  const day = new Date(`${date}T00:00:00.000Z`);
  await bookingModel.create({
    userId: player._id,
    venueId: venue._id,
    bookingDate: day,
    slot: "17:00-18:00"
  });

  const search = await request("/venues?search=river&minPrice=400&maxPrice=600");
  assert.equal(search.status, 200);
  assert.deepEqual(search.body.venues.map((item) => item._id), [venue._id.toString()]);

  const locationSearch = await request("/venues?search=tirupati");
  assert.ok(locationSearch.body.venues.some((item) => item._id === venue._id.toString()));
  assert.ok(!locationSearch.body.venues.some((item) => item._id === otherVenue._id.toString()));
  const firstPage = await request("/venues?search=pagination%20test&limit=1&page=1");
  const secondPage = await request("/venues?search=pagination%20test&limit=1&page=2");
  assert.equal(firstPage.body.venues.length, 1);
  assert.equal(firstPage.body.pagination.totalItems, 2);
  assert.equal(firstPage.body.pagination.hasNextPage, true);
  assert.notEqual(firstPage.body.venues[0]._id, secondPage.body.venues[0]._id);
  assert.equal((await request("/venues?limit=51")).status, 400);

  const availableAtTime = await request(`/venues?date=${date}&slot=18%3A00-19%3A00`);
  assert.ok(availableAtTime.body.venues.some((item) => item._id === venue._id.toString()));
  const bookedAtTime = await request(`/venues?date=${date}&slot=17%3A00-18%3A00`);
  assert.ok(!bookedAtTime.body.venues.some((item) => item._id === venue._id.toString()));

  const invalidFilters = await request("/venues?minPrice=800&maxPrice=100");
  assert.equal(invalidFilters.status, 400);
  const invalidAvailability = await request("/venues?slot=16%3A00-17%3A00");
  assert.equal(invalidAvailability.status, 400);
});

test("concurrent bookings cannot reserve the same venue slot twice", async () => {
  const venue = await venueModel.create({
    name: "Booking Test Venue",
    sport: "Football",
    location: "Test city",
    pricePerHour: 700
  });
  const firstUser = await createUser(`booker-one-${randomUUID()}@example.test`);
  const secondUser = await createUser(`booker-two-${randomUUID()}@example.test`);
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 2);
  const day = bookingDate.toISOString().slice(0, 10);
  const payload = { venueId: venue._id.toString(), bookingDate: day, slot: "18:00-19:00" };

  const results = await Promise.all([
    request("/bookings", { method: "POST", token: tokenFor(firstUser._id), body: payload }),
    request("/bookings", { method: "POST", token: tokenFor(secondUser._id), body: payload })
  ]);

  assert.equal(results.filter((result) => result.status === 201).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 1);
  assert.equal(await bookingModel.countDocuments({ venueId: venue._id, slot: payload.slot, status: "Booked" }), 1);

  const bookedEntry = await bookingModel.findOne({
    venueId: venue._id,
    slot: payload.slot,
    status: "Booked"
  });
  const ownerId = bookedEntry.userId.toString();
  const details = await request(`/bookings/${bookedEntry._id}`, { token: tokenFor(ownerId) });
  assert.equal(details.status, 200);
  assert.equal(details.body.booking.bookingDate, `${day}T00:00:00.000Z`);
  assert.equal(details.body.booking.venueId.name, venue.name);
  assert.equal(details.body.booking.cancellable, true);

  const duplicate = await request("/bookings", {
    method: "POST",
    token: tokenFor(ownerId),
    body: payload
  });
  assert.equal(duplicate.status, 409);

  const cancellation = await request(`/bookings/${bookedEntry._id}`, {
    method: "DELETE",
    token: tokenFor(ownerId)
  });
  assert.equal(cancellation.status, 200);
  const history = await request("/bookings/my-bookings", { token: tokenFor(ownerId) });
  assert.equal(history.status, 200);
  assert.equal(
    history.body.bookings.some((booking) => booking._id === bookedEntry._id.toString()),
    false
  );
  assert.equal(
    await bookingModel.countDocuments({ _id: bookedEntry._id, status: "Cancelled" }),
    1
  );

  const replacement = await request("/bookings", {
    method: "POST",
    token: tokenFor(ownerId === firstUser._id.toString() ? secondUser._id : firstUser._id),
    body: payload
  });
  assert.equal(replacement.status, 201);
});

test("booking dates are calendar dates in the venue timezone and passed slots are rejected", async () => {
  assert.equal(
    dateRangeForBooking("2026-10-19").start.toISOString(),
    "2026-10-19T00:00:00.000Z"
  );
  assert.equal(
    slotStartInTimeZone("2026-10-19", "18:00-19:00").toISOString(),
    "2026-10-19T12:30:00.000Z"
  );

  const user = await createUser(`date-booker-${randomUUID()}@example.test`);
  const venue = await venueModel.create({
    name: "Date Handling Venue",
    sport: "Football",
    location: "Test city",
    pricePerHour: 650
  });
  const today = dateKeyInTimeZone(new Date());
  const invalidDate = await request("/bookings", {
    method: "POST",
    token: tokenFor(user._id),
    body: { venueId: venue._id.toString(), bookingDate: "2026-02-30", slot: "18:00-19:00" }
  });
  assert.equal(invalidDate.status, 400);

  const dateTimePayload = {
    venueId: venue._id.toString(),
    bookingDate: `${today}T00:00:00.000Z`,
    slot: "18:00-19:00"
  };
  const nonDateOnly = await request("/bookings", {
    method: "POST",
    token: tokenFor(user._id),
    body: dateTimePayload
  });
  assert.equal(nonDateOnly.status, 400);

  if (minutesInTimeZone(new Date()) >= 17 * 60) {
    const passedSlot = await request("/bookings", {
      method: "POST",
      token: tokenFor(user._id),
      body: { venueId: venue._id.toString(), bookingDate: today, slot: "16:00-17:00" }
    });
    assert.equal(passedSlot.status, 400);
    assert.match(passedSlot.body.message, /already started/);

    const slots = await request(`/venues/${venue._id}/slots?date=${today}`);
    assert.equal(slots.status, 200);
    assert.equal(slots.body.availableSlots.includes("16:00-17:00"), false);
  }

  const cancellationDate = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const cancellationDateKey = dateKeyInTimeZone(cancellationDate);
  const soonBooking = await bookingModel.create({
    userId: user._id,
    venueId: venue._id,
    bookingDate: new Date(`${cancellationDateKey}T00:00:00.000Z`),
    slot: "00:00-01:00"
  });
  const cancellation = await request(`/bookings/${soonBooking._id}`, {
    method: "DELETE",
    token: tokenFor(user._id)
  });
  assert.equal(cancellation.status, 400);
  assert.match(cancellation.body.message, /6 hours/);
});

test("concurrent game joins respect capacity and leaving reopens a full game", async () => {
  const organizer = await createUser(`organizer-${randomUUID()}@example.test`);
  const firstPlayer = await createUser(`joiner-one-${randomUUID()}@example.test`);
  const secondPlayer = await createUser(`joiner-two-${randomUUID()}@example.test`);
  const venue = await venueModel.create({
    name: "Game Test Venue",
    sport: "Cricket",
    location: "Test city",
    pricePerHour: 800
  });
  const booking = await bookingModel.create({
    userId: organizer._id,
    venueId: venue._id,
    bookingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    slot: "19:00-20:00"
  });
  const game = await gameModel.create({
    title: "Capacity Test",
    sport: "Cricket",
    bookingId: booking._id,
    organizerId: organizer._id,
    maxPlayers: 2,
    joinedPlayers: [organizer._id],
    status: "Open"
  });

  const joinResults = await Promise.all([
    request(`/games/${game._id}/join`, { method: "POST", token: tokenFor(firstPlayer._id) }),
    request(`/games/${game._id}/join`, { method: "POST", token: tokenFor(secondPlayer._id) })
  ]);
  assert.equal(joinResults.filter((result) => result.status === 200).length, 1);
  assert.equal(joinResults.filter((result) => result.status === 409).length, 1);

  const fullGame = await gameModel.findById(game._id);
  assert.equal(fullGame.joinedPlayers.length, 2);
  assert.equal(fullGame.status, "Full");

  const successfulPlayer = joinResults[0].status === 200 ? firstPlayer : secondPlayer;
  const leave = await request(`/games/${game._id}/leave`, {
    method: "DELETE",
    token: tokenFor(successfulPlayer._id)
  });
  assert.equal(leave.status, 200);

  const reopenedGame = await gameModel.findById(game._id);
  assert.equal(reopenedGame.joinedPlayers.length, 1);
  assert.equal(reopenedGame.status, "Open");
  const joinedGames = await request("/games/joined-games", {
    token: tokenFor(successfulPlayer._id)
  });
  assert.equal(
    joinedGames.body.games.some((joinedGame) => joinedGame._id === game._id.toString()),
    false
  );
});

test("past games expire and cannot be created from a booking in the past", async () => {
  const organizer = await createUser(`expired-game-${randomUUID()}@example.test`);
  const venue = await venueModel.create({
    name: "Expired Game Venue",
    sport: "Football",
    location: "Test city",
    pricePerHour: 600
  });
  const oldBooking = await bookingModel.create({
    userId: organizer._id,
    venueId: venue._id,
    bookingDate: new Date("2020-01-01T00:00:00.000Z"),
    slot: "18:00-19:00"
  });
  const pastGame = await gameModel.create({
    title: "Old Community Game",
    sport: "Football",
    bookingId: oldBooking._id,
    organizerId: organizer._id,
    maxPlayers: 4,
    joinedPlayers: [organizer._id],
    status: "Open"
  });

  const openGames = await request("/games");
  assert.equal(openGames.status, 200);
  assert.equal(openGames.body.games.some((game) => game._id === pastGame._id.toString()), false);
  assert.equal((await gameModel.findById(pastGame._id)).status, "Expired");

  const newPastBooking = await bookingModel.create({
    userId: organizer._id,
    venueId: venue._id,
    bookingDate: new Date("2020-01-02T00:00:00.000Z"),
    slot: "18:00-19:00"
  });
  const createPastGame = await request("/games", {
    method: "POST",
    token: tokenFor(organizer._id),
    body: { title: "Should Not Start", bookingId: newPastBooking._id.toString(), maxPlayers: 4 }
  });
  assert.equal(createPastGame.status, 400);
  assert.match(createPastGame.body.message, /future bookings/i);

  const futureBooking = await bookingModel.create({
    userId: organizer._id,
    venueId: venue._id,
    bookingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    slot: "18:00-19:00"
  });
  const createdGame = await request("/games", {
    method: "POST",
    token: tokenFor(organizer._id),
    body: { title: "Future Game", bookingId: futureBooking._id.toString(), maxPlayers: 4 }
  });
  assert.equal(createdGame.status, 201);
  assert.equal(
    new Date(createdGame.body.game.expiresAt).toISOString(),
    slotStartInTimeZone(
      futureBooking.bookingDate.toISOString().slice(0, 10),
      futureBooking.slot
    ).toISOString()
  );
});

test("game chat persists messages and is restricted to joined players", async () => {
  const organizer = await createUser(`chat-organizer-${randomUUID()}@example.test`);
  const participant = await createUser(`chat-player-${randomUUID()}@example.test`);
  const outsider = await createUser(`chat-outsider-${randomUUID()}@example.test`);
  const venue = await venueModel.create({
    name: "Chat Test Venue",
    sport: "Football",
    location: "Test city",
    pricePerHour: 700
  });
  const booking = await bookingModel.create({
    userId: organizer._id,
    venueId: venue._id,
    bookingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    slot: "18:00-19:00"
  });
  const game = await gameModel.create({
    title: "Chat Test",
    sport: "Football",
    bookingId: booking._id,
    organizerId: organizer._id,
    maxPlayers: 3,
    joinedPlayers: [organizer._id, participant._id],
    status: "Open"
  });

  const forbiddenHistory = await request(`/games/${game._id}/messages`, {
    token: tokenFor(outsider._id)
  });
  assert.equal(forbiddenHistory.status, 403);
  const listedGames = await request("/games", { token: tokenFor(participant._id) });
  assert.equal(
    listedGames.body.games.find((listedGame) => listedGame._id === game._id.toString()).joinedByMe,
    true
  );
  const pagedGames = await request("/games?limit=1&page=1");
  assert.equal(pagedGames.status, 200);
  assert.equal(pagedGames.body.games.length, 1);
  assert.ok(pagedGames.body.pagination.totalItems >= 2);
  assert.equal(pagedGames.body.pagination.hasNextPage, true);

  const socket = connectSocket(baseUrl.replace("/api/v1", ""), {
    auth: { token: tokenFor(participant._id) },
    forceNew: true,
    reconnection: false
  });
  let adminSocket;

  try {
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });

    const joined = await new Promise((resolve) => {
      socket.emit("game:join", { gameId: game._id.toString() }, resolve);
    });
    assert.equal(joined.ok, true);
    adminSocket = connectSocket(baseUrl.replace("/api/v1", ""), {
      auth: { token: tokenFor(organizer._id) },
      forceNew: true,
      reconnection: false
    });
    await new Promise((resolve, reject) => {
      adminSocket.once("connect", resolve);
      adminSocket.once("connect_error", reject);
    });
    const organizerJoined = await new Promise((resolve) => {
      adminSocket.emit("game:join", { gameId: game._id.toString() }, resolve);
    });
    assert.equal(organizerJoined.ok, true);

    const receivedMessage = new Promise((resolve) => {
      socket.once("game:message", resolve);
    });
    const sent = await new Promise((resolve) => {
      socket.emit(
        "game:message",
        { gameId: game._id.toString(), content: "See you at the match!" },
        resolve
      );
    });
    assert.equal(sent.ok, true);

    const broadcast = await receivedMessage;
    assert.equal(broadcast.message.content, "See you at the match!");
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const allowed = await new Promise((resolve) => {
        socket.emit(
          "game:message",
          { gameId: game._id.toString(), content: `Rate test ${attempt}` },
          resolve
        );
      });
      assert.equal(allowed.ok, true);
    }
    const limited = await new Promise((resolve) => {
      socket.emit(
        "game:message",
        { gameId: game._id.toString(), content: "One too many" },
        resolve
      );
    });
    assert.equal(limited.ok, false);
    assert.match(limited.message, /too quickly/i);

    const history = await request(`/games/${game._id}/messages`, {
      token: tokenFor(participant._id)
    });
    assert.equal(history.status, 200);
    assert.equal(history.body.messages.length, 8);
    assert.equal(history.body.messages[0].senderId.name, "Test Player");
    assert.equal(await chatMessageModel.countDocuments({ gameId: game._id }), 8);

    await chatMessageModel.insertMany(
      Array.from({ length: 45 }, (_, index) => ({
        gameId: game._id,
        senderId: organizer._id,
        content: `Older message ${index + 1}`
      }))
    );
    const firstPage = await request(`/games/${game._id}/messages?limit=40`, {
      token: tokenFor(participant._id)
    });
    assert.equal(firstPage.status, 200);
    assert.equal(firstPage.body.messages.length, 40);
    assert.equal(firstPage.body.hasMore, true);
    const olderPage = await request(
      `/games/${game._id}/messages?limit=40&before=${firstPage.body.messages[0]._id}`,
      { token: tokenFor(participant._id) }
    );
    assert.equal(olderPage.status, 200);
    assert.equal(olderPage.body.messages.length, 13);
    assert.equal(olderPage.body.hasMore, false);

    const outsiderSocket = connectSocket(baseUrl.replace("/api/v1", ""), {
      auth: { token: tokenFor(outsider._id) },
      forceNew: true,
      reconnection: false
    });
    try {
      await new Promise((resolve, reject) => {
        outsiderSocket.once("connect", resolve);
        outsiderSocket.once("connect_error", reject);
      });
      const outsiderJoin = await new Promise((resolve) => {
        outsiderSocket.emit("game:join", { gameId: game._id.toString() }, resolve);
      });
      assert.equal(outsiderJoin.ok, false);
    } finally {
      outsiderSocket.disconnect();
    }

    const expiringSocket = connectSocket(baseUrl.replace("/api/v1", ""), {
      auth: {
        token: jwt.sign(
          { userId: participant._id.toString() },
          process.env.JWT_SECRET,
          { expiresIn: "1s" }
        )
      },
      forceNew: true,
      reconnection: false
    });
    try {
      await new Promise((resolve, reject) => {
        expiringSocket.once("connect", resolve);
        expiringSocket.once("connect_error", reject);
      });
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Socket stayed connected after its JWT expired")),
          5000
        );
        expiringSocket.once("disconnect", (reason) => {
          clearTimeout(timeout);
          resolve(reason);
        });
      }).then((reason) => assert.equal(reason, "io server disconnect"));
    } finally {
      expiringSocket.disconnect();
    }

    const accessRevoked = new Promise((resolve) => {
      socket.once("game:access-revoked", resolve);
    });
    const leaveGame = await request(`/games/${game._id}/leave`, {
      method: "DELETE",
      token: tokenFor(participant._id)
    });
    assert.equal(leaveGame.status, 200);
    assert.equal((await accessRevoked).gameId, game._id.toString());

    const afterLeaveHistory = await request(`/games/${game._id}/messages`, {
      token: tokenFor(participant._id)
    });
    assert.equal(afterLeaveHistory.status, 403);
    const afterLeaveSend = await new Promise((resolve) => {
      socket.emit(
        "game:message",
        { gameId: game._id.toString(), content: "I left this game" },
        resolve
      );
    });
    assert.equal(afterLeaveSend.ok, false);

    const cancellationRevokedPromise = new Promise((resolve) => {
      adminSocket.once("game:access-revoked", resolve);
    });
    const cancellation = await request(`/bookings/${booking._id}`, {
      method: "DELETE",
      token: tokenFor(organizer._id)
    });
    assert.equal(cancellation.status, 200);
    const cancellationRevoked = await cancellationRevokedPromise;
    assert.equal(cancellationRevoked.gameId, game._id.toString());
    assert.match(cancellationRevoked.reason, /booking was cancelled/i);
    assert.equal(await chatMessageModel.countDocuments({ gameId: game._id }), 0);

    const adminUser = await createUser(`game-admin-${randomUUID()}@example.test`, "admin");
    const adminBooking = await bookingModel.create({
      userId: organizer._id,
      venueId: venue._id,
      bookingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      slot: "19:00-20:00"
    });
    const adminDeletedGame = await gameModel.create({
      title: "Admin Removal Test",
      sport: "Football",
      bookingId: adminBooking._id,
      organizerId: organizer._id,
      maxPlayers: 3,
      joinedPlayers: [organizer._id],
      status: "Open"
    });
    const adminJoin = await new Promise((resolve) => {
      adminSocket.emit("game:join", { gameId: adminDeletedGame._id.toString() }, resolve);
    });
    assert.equal(adminJoin.ok, true);
    const adminRevoked = new Promise((resolve) => {
      adminSocket.once("game:access-revoked", resolve);
    });
    const deletion = await request(`/admin/games/${adminDeletedGame._id}`, {
      method: "DELETE",
      token: tokenFor(adminUser._id)
    });
    assert.equal(deletion.status, 200);
    assert.equal((await adminRevoked).gameId, adminDeletedGame._id.toString());
  } finally {
    socket.disconnect();
    adminSocket?.disconnect();
  }
});

test("production configuration rejects missing or weak secrets and missing service URLs", () => {
  const original = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    mongoUri: process.env.MONGO_URI,
    frontendOrigin: process.env.FRONTEND_ORIGIN
  };

  try {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    delete process.env.MONGO_URI;
    delete process.env.FRONTEND_ORIGIN;
    assert.throws(validateRuntimeConfig, /JWT_SECRET must be configured/);

    process.env.JWT_SECRET = "short";
    assert.throws(validateRuntimeConfig, /at least 32 characters/);

    process.env.JWT_SECRET = "strong-test-secret-that-is-at-least-32-chars";
    assert.throws(validateRuntimeConfig, /MONGO_URI must be configured/);

    process.env.MONGO_URI = "mongodb+srv://example.test/nexplay";
    assert.throws(validateRuntimeConfig, /FRONTEND_ORIGIN must be configured/);

    process.env.FRONTEND_ORIGIN = "https://nexplay.example";
    assert.doesNotThrow(validateRuntimeConfig);
  } finally {
    if (original.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original.nodeEnv;

    if (original.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original.jwtSecret;

    if (original.mongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = original.mongoUri;

    if (original.frontendOrigin === undefined) delete process.env.FRONTEND_ORIGIN;
    else process.env.FRONTEND_ORIGIN = original.frontendOrigin;
  }
});
