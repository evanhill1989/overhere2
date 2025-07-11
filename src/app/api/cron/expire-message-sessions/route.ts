import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageSessionsTable } from "@/lib/schema";
import { lte, eq, and } from "drizzle-orm";
import { subHours } from "date-fns";

export async function POST(request: Request) {
  console.log("🔥 Cron job triggered: Expiring message sessions");
  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.CRON_API_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expiryThreshold = subHours(new Date(), 2);

  const result = await db
    .update(messageSessionsTable)
    .set({ status: "expired" })
    .where(
      and(
        lte(messageSessionsTable.createdAt, expiryThreshold),
        eq(messageSessionsTable.status, "accepted"),
      ),
    )
    .returning();

  return NextResponse.json({
    success: true,
    updated: result.length ?? 0,
  });
}
