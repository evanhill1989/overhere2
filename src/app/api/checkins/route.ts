// app/api/checkins/route.ts

import { db } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { checkinsTable } from "@/lib/schema";
import { subHours } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeQueryParam, placeIdSchema } from "@/lib/validators/common";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPlaceId = searchParams.get("placeId");

    // ✅ Validate and sanitize
    const placeId = placeIdSchema.parse(
      sanitizeQueryParam(rawPlaceId ?? undefined),
    );

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
