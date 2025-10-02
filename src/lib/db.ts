import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });

// ✅ Add casing config
export const db = drizzle(client, {
  schema,
  casing: "snake_case", // Use snake_case in DB, but Drizzle handles conversion
});
