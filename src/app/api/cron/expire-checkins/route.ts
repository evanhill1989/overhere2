import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkinsTable } from "@/lib/newSchema";
import { lt } from "drizzle-orm";
import { subHours } from "date-fns";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.CRON_API_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twoHoursAgo = subHours(new Date(), 2);

  const result = await db
    .delete(checkinsTable)
    .where(lt(checkinsTable.createdAt, twoHoursAgo));

  return NextResponse.json({
    success: true,
    deleted: result.rowCount ?? 0,
  });
}
