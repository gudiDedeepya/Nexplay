import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import {
  bookingModel,
  gameModel,
  userModel,
  venueModel
} from "../src/models/userschema.js";
import { validateRuntimeConfig } from "../src/config/security.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "nexplay-test-secret-with-sufficient-length";

const databaseName = `NEXPLAY_TEST_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/NEXPLAY");
databaseUrl.pathname = `/${databaseName}`;

let baseUrl;
let server;

function tokenFor(userId) {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET);
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
    gameModel.syncIndexes()
  ]);

  const { default: app } = await import("../src/app.js");
  server = app.listen(0);
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
  assert.equal(results.filter((result) => [400, 409].includes(result.status)).length, 1);
  assert.equal(await bookingModel.countDocuments({ venueId: venue._id, slot: payload.slot, status: "Booked" }), 1);

  const bookedEntry = await bookingModel.findOne({
    venueId: venue._id,
    slot: payload.slot,
    status: "Booked"
  });
  const ownerId = bookedEntry.userId.toString();
  const cancellation = await request(`/bookings/${bookedEntry._id}`, {
    method: "DELETE",
    token: tokenFor(ownerId)
  });
  assert.equal(cancellation.status, 200);

  const replacement = await request("/bookings", {
    method: "POST",
    token: tokenFor(ownerId === firstUser._id.toString() ? secondUser._id : firstUser._id),
    body: payload
  });
  assert.equal(replacement.status, 201);
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
