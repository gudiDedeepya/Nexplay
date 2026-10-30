// Measures NexPlay chat round-trip latency:
// time from emitting "game:message" until the server's acknowledgement arrives.
// That includes validation, the Redis rate-limit check and the MongoDB save.
//
// Run from the repository root (so socket.io-client resolves from node_modules):
//   node measure-latency.mjs
//
// Settings come from environment variables (never write your password in this file):
//   EMAIL, PASSWORD   an account that CREATED an Open game whose slot is still in the future
//   BASE_URL          default http://localhost:5000
//   COUNT             number of measured messages, default 40

import { io } from "socket.io-client";

const BASE = (process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const COUNT = Number(process.env.COUNT || 40);
const PAUSE_MS = 1500; // server allows 8 messages per 10 s; this keeps us under it

if (!EMAIL || !PASSWORD) {
  console.error("Set the EMAIL and PASSWORD environment variables first.");
  process.exit(1);
}

const api = `${BASE}/api/v1`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(path, options = {}) {
  const response = await fetch(api + path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${body.message || ""}`);
  }
  return body;
}

function sendOnce(socket, gameId, content) {
  return new Promise((resolve) => {
    const start = performance.now();
    socket.emit("game:message", { gameId, content }, (result) => {
      resolve({ ms: performance.now() - start, result });
    });
  });
}

console.log(`Target: ${BASE}`);
console.log("Signing in (the server may take a while to wake if it was asleep)...");
const { token } = await call("/signin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD })
});

const { games } = await call("/games/my-games", {
  headers: { Authorization: `Bearer ${token}` }
});
const game = games.find(
  (candidate) =>
    ["Open", "Full"].includes(candidate.status) &&
    (!candidate.expiresAt || new Date(candidate.expiresAt) > new Date())
);
if (!game) {
  console.error(
    "No active game found. Create a booking for a future slot, then create a game on it in the app."
  );
  process.exit(1);
}
console.log(`Using game: "${game.title}"`);

const socket = io(BASE, { auth: { token } });
await new Promise((resolve, reject) => {
  socket.once("connect", resolve);
  socket.once("connect_error", (error) => reject(new Error(`Socket connect failed: ${error.message}`)));
});

await new Promise((resolve, reject) => {
  socket.emit("game:join", { gameId: game._id }, (result) => {
    if (result?.ok) resolve();
    else reject(new Error(result?.message || "Could not join the game's chat"));
  });
});

// Warm-up message: the first one is slower (cold connection, cold caches), so it is not counted.
await sendOnce(socket, game._id, "latency test (warm-up)");
await sleep(PAUSE_MS);

const times = [];
for (let i = 1; i <= COUNT; i += 1) {
  const { ms, result } = await sendOnce(socket, game._id, `latency test ${i}`);
  if (result?.ok) {
    times.push(ms);
  } else {
    console.log(`Message ${i} rejected: ${result?.message}`);
  }
  await sleep(PAUSE_MS);
}
socket.disconnect();

if (times.length === 0) {
  console.error("No messages were accepted, so there is nothing to report.");
  process.exit(1);
}

times.sort((a, b) => a - b);
const percentile = (p) => times[Math.min(times.length - 1, Math.ceil((p / 100) * times.length) - 1)];
const average = times.reduce((sum, value) => sum + value, 0) / times.length;

console.log("\nRound-trip latency (emit -> acknowledgement), milliseconds");
console.log(`  messages measured: ${times.length}`);
console.log(`  min:     ${times[0].toFixed(0)}`);
console.log(`  average: ${average.toFixed(0)}`);
console.log(`  median:  ${percentile(50).toFixed(0)}`);
console.log(`  p95:     ${percentile(95).toFixed(0)}`);
console.log(`  max:     ${times[times.length - 1].toFixed(0)}`);
process.exit(0);
