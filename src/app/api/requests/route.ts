// app/api/requests/route.ts

import { db } from "@/lib/db";
import { eq, or, and, gt } from "drizzle-orm";
import { messageSessionRequestsTable, checkinsTable } from "@/lib/schema";
import { subHours } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const placeId = searchParams.get("placeId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const twoHoursAgo = subHours(new Date(), 2);

  // Build the base query
  let whereConditions = and(
    or(
      eq(messageSessionRequestsTable.initiatorId, userId),
      eq(messageSessionRequestsTable.initiateeId, userId),
    ),
    gt(messageSessionRequestsTable.createdAt, twoHoursAgo),
  );

  // Add placeId filter if provided
  if (placeId) {
    whereConditions = and(
      whereConditions,
      eq(messageSessionRequestsTable.placeId, placeId),
    );
  }

  const requests = await db
    .select({
      id: messageSessionRequestsTable.id,
      initiatorId: messageSessionRequestsTable.initiatorId,
      initiateeId: messageSessionRequestsTable.initiateeId,
      placeId: messageSessionRequestsTable.placeId,
      status: messageSessionRequestsTable.status,
      createdAt: messageSessionRequestsTable.createdAt,
      topic: checkinsTable.topic, // ← This join gets you the topic
    })
    .from(messageSessionRequestsTable)
    .leftJoin(
      checkinsTable,
      and(
        eq(checkinsTable.userId, messageSessionRequestsTable.initiatorId),
        eq(checkinsTable.placeId, messageSessionRequestsTable.placeId),
        eq(checkinsTable.isActive, true),
      ),
    )
    .where(whereConditions);

  return NextResponse.json(requests);
}
