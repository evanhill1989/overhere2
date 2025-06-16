// app/api/requests/route.ts
import { db } from "@/lib/db";
import { messageSessionRequestsTable } from "@/lib/newSchema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json([], { status: 400 });
  }

  const requests = await db.query.messageSessionRequestsTable.findMany({
    where: eq(messageSessionRequestsTable.initiateeId, userId),
    columns: {
      id: true,
      initiatorId: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(requests);
}
