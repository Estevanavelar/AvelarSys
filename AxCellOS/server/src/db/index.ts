import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "../lib/config";

// Create connection
const client = postgres(config.database.url, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, {
  schema,
  logger: config.server.nodeEnv === "development",
});

// Export types
export type Database = typeof db;

// Helper function to get db instance (for testing)
export function getDB() {
  return db;
}