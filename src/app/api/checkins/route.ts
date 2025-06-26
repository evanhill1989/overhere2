// app/api/checkins/route.ts

import { db } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { checkinsTable } from "@/lib/schema";
import { subHours } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
  }

  const twoHoursAgo = subHours(new Date(), 2);

  const checkins = await db
    .select()
    .from(checkinsTable)
    .where(
      and(
        eq(checkinsTable.placeId, placeId),
        gt(checkinsTable.createdAt, twoHoursAgo),
      ),
    );

  return NextResponse.json(checkins, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
