import { randomUUID } from "node:crypto";
import { createClient } from "redis";

const limitScript = `
  local key = KEYS[1]
  local windowMs = tonumber(ARGV[1])
  local limit = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  redis.call("ZREMRANGEBYSCORE", key, "-inf", now - windowMs)
  local count = redis.call("ZCARD", key)
  if count >= limit then return 0 end
  redis.call("ZADD", key, now, ARGV[4])
  redis.call("PEXPIRE", key, windowMs)
  return 1
`;

export function createInMemoryChatRateLimiter({ limit = 8, windowMs = 10_000 } = {}) {
  const attemptsByUser = new Map();
  return async function allowChatMessage(userId, now = Date.now()) {
    const recent = (attemptsByUser.get(userId) || [])
      .filter((timestamp) => timestamp > now - windowMs);
    if (recent.length >= limit) {
      attemptsByUser.set(userId, recent);
      return false;
    }
    recent.push(now);
    attemptsByUser.set(userId, recent);
    return true;
  };
}

export async function createRedisChatRateLimiter({
  url = process.env.REDIS_URL,
  limit = 8,
  windowMs = 10_000,
  client: injectedClient
} = {}) {
  if (!url && !injectedClient) {
    throw new Error("REDIS_URL must be configured for shared chat rate limits.");
  }
  const client = injectedClient || createClient({ url });
  client.on("error", (error) => console.error("Chat rate-limit Redis error:", error));
  if (!injectedClient) await client.connect();

  const allowChatMessage = async (userId, now = Date.now()) => {
    const allowed = await client.eval(limitScript, {
      keys: [`nexplay:chat-rate:${userId}`],
      arguments: [
        String(windowMs),
        String(limit),
        String(now),
        `${now}:${randomUUID()}`
      ]
    });
    return Number(allowed) === 1;
  };

  return {
    allowChatMessage,
    close: () => client.close()
  };
}
