import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkinsTable } from "@/lib/schema";
import { lte } from "drizzle-orm";
import { subHours } from "date-fns";

export async function POST(request: Request) {
  console.log("🔥 Cron job triggered: Expiring stale check-ins");
  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.CRON_API_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkinTimer = subHours(new Date(), 2);

  const result = await db
    .delete(checkinsTable)
    .where(lte(checkinsTable.createdAt, checkinTimer))
    .returning();

  return NextResponse.json({
    success: true,
    deleted: result.length ?? 0,
  });
}
