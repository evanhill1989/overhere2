// scripts/drop-message-sessions.ts
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function dropTable() {
  await db.execute(sql`DROP TABLE IF EXISTS message_sessions CASCADE`);
  console.log("✅ Dropped message_sessions table");
}

dropTable().then(() => process.exit(0));
