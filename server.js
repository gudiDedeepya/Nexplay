import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { validateRuntimeConfig } from "./src/config/security.js";

const PORT = process.env.PORT || 5000;

validateRuntimeConfig();

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
