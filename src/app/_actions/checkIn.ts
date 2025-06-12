// app/_actions/checkIn.ts
import { checkInSchema } from "@/lib/validators/checkin";
import { db } from "@/lib/db";
import { checkinsTable } from "@/lib/newSchema";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ensureUserInDb } from "@/utils/supabase/ensureUserInDb";

export async function checkIn(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await ensureUserInDb(user);

  const rawData = {
    placeId: formData.get("placeId"),
    placeName: formData.get("placeName"),
    placeAddress: formData.get("placeAddress"),
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string),
  };

  const parsed = checkInSchema.parse(rawData);

  await db
    .update(checkinsTable)
    .set({ status: "available" })
    .where(eq(checkinsTable.userId, user.id));

  await db.insert(checkinsTable).values({
    userId: user.id,
    placeId: parsed.place_id,
    placeName: parsed.place_name,
    placeAddress: parsed.place_address,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    status: "available",
  });

  redirect(`/places/${parsed.place_id}`);
}
