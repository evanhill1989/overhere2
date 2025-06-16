import "dotenv/config";
// src/index.ts (or wherever you initialize 'db')

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// Import ALL exports from your schema file as a single object named 'schema'
import * as schema from "@/lib/schema"; // Adjust path if needed

// --- Choose the correct connection string for your APPLICATION RUNTIME ---
// Usually, for serverless functions/edge runtime, the POOLER URL is preferred.
// Drizzle Kit needed the DIRECT_URL, but your running app might need DATABASE_URL.
// Check Supabase docs based on where you deploy/run your app.
const connectionString = process.env.DATABASE_URL!; // Or maybe DIRECT_URL? Double-check.

// It's often recommended to disable prepare statements with Supabase/PgBouncer (pooler)
const client = postgres(connectionString, { prepare: false });

// --- Initialize Drizzle WITH the schema ---
// Pass the imported 'schema' object here
export const db = drizzle(client, { schema });
// --- End of Fix ---
