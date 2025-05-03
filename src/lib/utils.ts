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

// --- NEW: Haversine Distance Calculation ---
/**
 * Calculates the great-circle distance between two points
 * on the Earth (specified in decimal degrees).
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns The distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in meters
  return distance;
}
// --- END NEW ---
