import { createServer } from "node:http";
import app, { allowedOrigins } from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { validateRuntimeConfig } from "./src/config/security.js";
import { attachChatServer } from "./src/realtime/chatServer.js";
import { createRedisChatRateLimiter } from "./src/services/chatRateLimiter.js";
import { startGameExpiryScheduler } from "./src/utils/gameExpiry.js";

const PORT = process.env.PORT || 5000;
const server = createServer(app);

async function startServer() {
  try {
    validateRuntimeConfig();
    await connectDB();
    const chatRateLimiter = await createRedisChatRateLimiter();
    attachChatServer(server, allowedOrigins, chatRateLimiter);
    startGameExpiryScheduler();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
