// app/api/requests/route.ts

import { db } from "@/lib/db";
import { messageSessionRequestsTable } from "@/lib/schema";
import { eq, or, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const placeId = req.nextUrl.searchParams.get("placeId");
  console.log("userId", userId);
  console.log("placeId", placeId);
  if (!userId || !placeId) {
    return NextResponse.json([], { status: 400 });
  }

  const requests = await db
    .select()
    .from(messageSessionRequestsTable)
    .where(
      and(
        or(
          eq(messageSessionRequestsTable.initiatorId, userId),
          eq(messageSessionRequestsTable.initiateeId, userId),
        ),
        eq(messageSessionRequestsTable.placeId, placeId),
      ),
    );

  return NextResponse.json(requests);
}
