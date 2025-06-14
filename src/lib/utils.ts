import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tables } from "@/types/supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CheckinRow = Tables<"checkins">;
type ChatSessionRow = Tables<"chat_sessions">;

export function isValidChatSessionData(data: unknown): data is ChatSessionRow {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    typeof obj.status === "string" && // This is an enum, but will be a string at runtime
    typeof obj.initiator_checkin_id === "number" &&
    typeof obj.receiver_checkin_id === "number" &&
    typeof obj.place_id === "string" && // Added based on your schema
    typeof obj.created_at === "string"
  );
}

export function isValidCheckinData(data: unknown): data is CheckinRow {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === "number" &&
    typeof obj.user_id === "string" &&
    typeof obj.place_id === "string" &&
    typeof obj.place_name === "string" &&
    typeof obj.place_address === "string" &&
    typeof obj.status === "string" &&
    typeof obj.created_at === "string"
  );
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
  lon2: number,
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
