// src/hooks/realtime-hooks/useSpecificChannelPrimer.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { PlaceId } from "@/lib/types/core";

export function useSpecificChannelPrimer(
  placeId: PlaceId | null, // ⚠️ Removed userId since we're only checking the checkins channel now
) {
  // State to report success
  const [isPrimed, setIsPrimed] = useState(false);

  useEffect(() => {
    if (!placeId || isPrimed) return; // Don't run if already primed

    const supabase = createClient();
    const checkinsChannelName = `checkins-${placeId}`; // 1. Subscribe to the channel
    const channel = supabase
      .channel(checkinsChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `place_id=eq.${placeId}`,
        },
        () => {}, // No need to process events
      )
      .subscribe((status) => {
        // 2. Check for the simplest success status
        if (status === "SUBSCRIBED") {
          setIsPrimed(true);
        }
      });

    return () => {
      // Clean up the channel on unmount, but don't worry about state within the hook
      supabase.removeChannel(channel);
    }; // ⚠️ Added isPrimed to the deps array to prevent re-runs once success is achieved
  }, [placeId, isPrimed]);

  return isPrimed;
}
