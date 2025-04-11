// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/index";
import { checkinsTable } from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { revalidatePath } from "next/cache";

interface PlaceData {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface ActionResult {
  success: boolean;
  message: string;
  checkinId?: number;
}

export async function submitCheckIn(place: PlaceData): Promise<ActionResult> {
  const { getUser, isAuthenticated } = getKindeServerSession();
  console.log("Submitting check-in...");
  console.log("Place data:", place);
  if (!(await isAuthenticated())) {
    return { success: false, message: "User not authenticated." };
  }
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Could not retrieve user details." };
  }

  if (!place || !place.id || !place.name) {
    return { success: false, message: "Invalid place data provided." };
  }

  try {
    const newCheckin = await db
      .insert(checkinsTable)
      .values({
        userId: user.id,
        placeId: place.id,
        placeName: place.name,
        placeAddress: place.address,
        latitude: place.lat,
        longitude: place.lng,
      })
      .returning({ id: checkinsTable.id });

    if (!newCheckin || newCheckin.length === 0) {
      throw new Error("Failed to insert check-in into database.");
    }

    console.log(`User ${user.id} checked into ${place.name}`);

    revalidatePath("/");

    return {
      success: true,
      message: "Check-in successful!",
      checkinId: newCheckin[0].id,
    };
  } catch (error: any) {
    console.error("Check-in failed:", error);
    return {
      success: false,
      message: `Check-in failed: ${error.message || "Database error"}`,
    };
  }
}
