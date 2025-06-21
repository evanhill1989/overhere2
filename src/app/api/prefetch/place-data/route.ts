// 1. Create this new file: app/api/prefetch/place-data/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkinsTable, messageSessionsTable } from "@/lib/schema";
import { eq, and, or, gt } from "drizzle-orm";
import { subHours } from "date-fns";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");
  const userId = searchParams.get("userId");
  console.log("✅ Prefetch API route hit:", { placeId, userId });

  if (!placeId || !userId) {
    return NextResponse.json(
      { error: "Missing placeId or userId" },
      { status: 400 },
    );
  }

  const checkins = await db
    .select()
    .from(checkinsTable)
    .where(
      and(eq(checkinsTable.placeId, placeId), eq(checkinsTable.isActive, true)),
    );

  const twoHoursAgo = subHours(new Date(), 2);
  const session = await db.query.messageSessionsTable.findFirst({
    where: and(
      eq(messageSessionsTable.placeId, placeId),
      or(
        eq(messageSessionsTable.initiatorId, userId),
        eq(messageSessionsTable.initiateeId, userId),
      ),
      gt(messageSessionsTable.createdAt, twoHoursAgo),
    ),
  });

  return NextResponse.json({ checkins, session });
}
