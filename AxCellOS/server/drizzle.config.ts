import { defineConfig } from "drizzle-kit";
import { config } from "./src/lib/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.database.url,
  },
  verbose: true,
  strict: true,
});