// src/lib/db.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });

// ✅ Drizzle handles conversion automatically
export const db = drizzle(client, {
  schema,
  casing: "snake_case", // DB uses snake_case, Drizzle returns camelCase
});
