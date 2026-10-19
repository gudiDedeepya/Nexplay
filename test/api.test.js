import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { io as connectSocket } from "socket.io-client";
import {
  bookingModel,
  chatMessageModel,
  gameModel,
  userModel,
  venueModel
} from "../src/models/userschema.js";
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
    body: await response.json()
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
  assert.equal(signup.status, 201);
  assert.equal((await userModel.findOne({ email })).role, "user");

  const duplicate = await request("/signup", {
    method: "POST",
    body: {
      name: "Signup Player",
      email,
      password: "ValidPass123"
    }
  });
  assert.equal(duplicate.status, 403);

  const signin = await request("/signin", {
    method: "POST",
    body: { email, password: "ValidPass123" }
  });
  assert.equal(signin.status, 200);
  assert.equal((await request("/me", { token: signin.body.token })).status, 200);
  assert.equal((await request("/me")).status, 401);
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

  const forbidden = await request("/venues", {
    method: "POST",
    token: tokenFor(regularUser._id),
    body: venueData
  });
  assert.equal(forbidden.status, 403);

  const created = await request("/venues", {
    method: "POST",
    token: tokenFor(adminUser._id),
    body: venueData
  });
  assert.equal(created.status, 201);
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
  assert.equal(history.body.bookings[0].userId.email, regularUser.email);

  const deactivated = await request(`/admin/venues/${venueId}`, {
    method: "DELETE",
    token: tokenFor(adminUser._id)
  });
  assert.equal(deactivated.status, 200);
  const publicVenues = await request("/venues");
  assert.equal(publicVenues.body.venues.some((venue) => venue._id === venueId), false);
  assert.equal(await bookingModel.countDocuments({ venueId }), 1);
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
  assert.equal(history.body.bookings.find((booking) => booking._id === bookedEntry._id.toString()).status, "Cancelled");

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

  const cancellationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
  assert.match(cancellation.body.message, /24 hours/);
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

  const socket = connectSocket(baseUrl.replace("/api/v1", ""), {
    auth: { token: tokenFor(participant._id) },
    forceNew: true,
    reconnection: false
  });

  try {
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });

    const joined = await new Promise((resolve) => {
      socket.emit("game:join", { gameId: game._id.toString() }, resolve);
    });
    assert.equal(joined.ok, true);

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

    const history = await request(`/games/${game._id}/messages`, {
      token: tokenFor(participant._id)
    });
    assert.equal(history.status, 200);
    assert.equal(history.body.messages.length, 1);
    assert.equal(history.body.messages[0].senderId.name, "Test Player");
    assert.equal(await chatMessageModel.countDocuments({ gameId: game._id }), 1);

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
    assert.equal(olderPage.body.messages.length, 6);
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

    const cancellation = await request(`/bookings/${booking._id}`, {
      method: "DELETE",
      token: tokenFor(organizer._id)
    });
    assert.equal(cancellation.status, 200);
    assert.equal(await chatMessageModel.countDocuments({ gameId: game._id }), 0);
  } finally {
    socket.disconnect();
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
