// src/components/debug/RealtimeStatusIndicator.tsx
"use client";

// import { useRequestDeliveryDebugger } from "@/hooks/useRequestStateTracker";
import type { UserId, PlaceId } from "@/lib/types/database";

type RealtimeStatusIndicatorProps = {
  userId: UserId | null;
  placeId: PlaceId | null;
  enabled?: boolean;
};

export function RealtimeStatusIndicator(
  props: RealtimeStatusIndicatorProps,
) {
  void props; // Debug component temporarily disabled - needs useRequestDeliveryDebugger implementation
  return null;
}
