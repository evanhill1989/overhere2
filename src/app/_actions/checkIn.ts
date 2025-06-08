"use server";

import { db } from "@/lib/db";
import { checkinsTable } from "@/lib/newSchema";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

export async function checkIn(
  placeId: string,
  placeName: string,
  placeAddress: string,
  latitude: number,
  longitude: number,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!data.user) throw new Error("Not authenticated");

  if (!user) {
    redirect("/");
  }

  await db
    .update(checkinsTable)
    .set({ status: "available" })
    .where(eq(checkinsTable.userId, user.id));

  await db.insert(checkinsTable).values({
    userId: user.id,
    placeId,
    placeName,
    placeAddress,
    latitude,
    longitude,
    status: "available",
  });

  redirect(`/places/${placeId}`);
}
