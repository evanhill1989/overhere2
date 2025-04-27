import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tables } from "@/types/supabase";
import type { SelectCheckin } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CheckinRow = Tables<"checkins">;

export function transformCheckinRowToSelect(
  checkinRow: CheckinRow | Partial<CheckinRow>
): SelectCheckin | null {
  // Guard against incomplete data, especially from payload.old which might be partial
  if (
    !checkinRow ||
    typeof checkinRow.id !== "number" ||
    !checkinRow.created_at ||
    !checkinRow.user_id ||
    !checkinRow.place_id ||
    !checkinRow.place_name ||
    !checkinRow.place_address ||
    !checkinRow.status
  ) {
    console.warn(
      "Incomplete CheckinRow data received for transformation:",
      checkinRow
    );
    return null; // Or handle appropriately, maybe return Partial<SelectCheckin>?
  }

  // Perform the transformation
  const transformed: SelectCheckin = {
    id: checkinRow.id,
    createdAt: new Date(checkinRow.created_at), // Convert string to Date
    userId: checkinRow.user_id, // Map snake_case
    placeId: checkinRow.place_id, // Map snake_case
    placeName: checkinRow.place_name, // Map snake_case
    placeAddress: checkinRow.place_address, // Map snake_case
    latitude: checkinRow.latitude ?? null, // Handle potential null explicitly
    longitude: checkinRow.longitude ?? null, // Handle potential null explicitly
    status: checkinRow.status, // Assumes enum values match
    topic: checkinRow.topic ?? null, // Handle potential null explicitly
  };
  return transformed;
}
