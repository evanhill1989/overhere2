"use client";

import { useQuery } from "@tanstack/react-query";
import { getUnreadMessageCounts } from "@/app/_actions/messageActions";
import type { PlaceId, UserId } from "@/lib/types/database";

export function useUnreadMessageCounts(
  placeId: PlaceId,
  currentUserId: UserId,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["unreadMessageCounts", placeId, currentUserId],
    queryFn: async () => {
      console.log("🔍 Fetching unread message counts...");
      const result = await getUnreadMessageCounts(placeId, currentUserId);
      console.log("📊 Unread counts result:", result);
      return result;
    },
    enabled,
    staleTime: Infinity,
  });
}
