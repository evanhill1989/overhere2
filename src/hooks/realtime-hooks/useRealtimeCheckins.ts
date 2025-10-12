// src/hooks/realtime-hooks/useRealtimeCheckins.ts
// src/hooks/realtime-hooks/useRealtimeCheckins.ts - SIMPLIFIED VERSION
// src/hooks/realtime-hooks/useRealtimeCheckins.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Checkin, PlaceId } from "@/lib/types/database";
import { getCheckinsAtPlace } from "@/app/_actions/checkinQueries";

let hookCallCount = 0;

export function useRealtimeCheckins(
  placeId: PlaceId | null,
  debugName?: string,
) {
  hookCallCount++;

  // 🔍 Get the call stack to see WHO called this hook
  const caller = new Error().stack?.split("\n")[2]?.trim() || "unknown";

  console.log(`🔍 useRealtimeCheckins call #${hookCallCount}`, {
    placeId,
    debugName,
    caller,
  });

  const query = useQuery<Checkin[], Error>({
    queryKey: ["checkins", placeId],
    queryFn: () => {
      console.log(
        "📞 Query function executing for:",
        placeId,
        "from:",
        debugName,
      );
      return getCheckinsAtPlace(placeId!);
    },
    enabled: !!placeId,
    staleTime: 30000,
  });

  console.log(`📊 Query state for call #${hookCallCount}:`, {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    dataLength: query.data?.length,
    debugName,
  });

  return query;
}
// "use client";

// import { useEffect, useRef } from "react";
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { createClient } from "@/utils/supabase/client";
// import type { RealtimeChannel } from "@supabase/supabase-js";

// import type { Checkin, DatabaseCheckin } from "@/lib/types/database";
// import type { PlaceId } from "@/lib/types/core";
// import { checkinIdSchema } from "@/lib/types/core";
// import { mapCheckinToCamel } from "@/lib/caseConverter";
// import { getCheckinsAtPlace } from "@/app/_actions/checkinQueries";

// async function fetchCheckins(placeId: PlaceId): Promise<Checkin[]> {
//   console.log("🔍 useRealtimeCheckins called with:", {
//     placeId,
//     placeIdType: typeof placeId,
//     callStack: new Error().stack?.split("\n")[1], // Show where it's called from
//   });
//   const result = await getCheckinsAtPlace(placeId);
//   console.log("📬 [useRealtimeCheckins] Received", result.length, "checkins");
//   return result;
// }

// export function useRealtimeCheckins(placeId: PlaceId | null) {
//   const callStack = new Error().stack;
//   const caller = callStack?.split("\n")[2]?.trim(); // Get the calling component

//   console.log("🔍 useRealtimeCheckins called from:", caller);

//   if (typeof window === "undefined") {
//     console.log("❌ This code is running on the server (unexpected!)");
//   } else {
//     console.log("✅ This code is running on the client");
//   }

//   const queryClient = useQueryClient();

//   // ✅ DEBUG: Check if query already exists
//   const existingQuery = queryClient.getQueryData(["checkins", placeId]);
//   console.log("🔍 🔍🔍🔍 Existing query data:", existingQuery);

//   const channelRef = useRef<RealtimeChannel | null>(null);
//   const isSubscribingRef = useRef<boolean>(false);

//   console.log(
//     "🎬 [useRealtimeCheckins] Hook initialized with placeId:",
//     placeId,
//   );

//   // 1. Fetch initial data via server action
//   const query = useQuery<Checkin[], Error>({
//     queryKey: ["checkins", placeId],
//     queryFn: () => {
//       console.log("🔄 [useRealtimeCheckins] Query function executing");
//       return fetchCheckins(placeId!);
//     },
//     enabled: !!placeId,
//     staleTime: 3000,
//     refetchInterval: false,
//     refetchOnWindowFocus: false,
//     refetchOnMount: false,
//   });

//   console.log("📊 [useRealtimeCheckins] Query state:", {
//     isLoading: query.isLoading,
//     isFetching: query.isFetching,
//     isError: query.isError,
//     dataLength: query.data?.length,
//     error: query.error?.message,
//   });

//   // 2. Real-time subscription
//   useEffect(() => {
//     if (!placeId) {
//       console.log(
//         "⚠️ [useRealtimeCheckins] No placeId, skipping real-time setup",
//       );
//       return;
//     }

//     if (channelRef.current) {
//       console.log("⚠️ Channel already exists, skipping subscription setup");
//       return;
//     }

//     console.log(
//       "📡 [useRealtimeCheckins] Setting up real-time subscription for:",
//       placeId,
//     );
//     const supabase = createClient();

//     if (channelRef.current) {
//       console.log("🧹 [useRealtimeCheckins] Cleaning up existing channel");
//       try {
//         supabase.removeChannel(channelRef.current);
//       } catch (error) {
//         console.warn("⚠️ [useRealtimeCheckins] Error removing channel:", error);
//       }
//       channelRef.current = null;
//     }
//     const channelName = `checkins-${placeId}-${Date.now()}`;
//     console.log("📺 [useRealtimeCheckins] Creating channel:", channelName);
//     isSubscribingRef.current = true;

//     try {
//       const channel = supabase
//         .channel(channelName)
//         .on(
//           "postgres_changes",
//           {
//             event: "*",
//             schema: "public",
//             table: "checkins",
//             filter: `place_id=eq.${placeId}`,
//           },
//           (payload) => {
//             console.log("🔔 [useRealtimeCheckins] Real-time event received:", {
//               eventType: payload.eventType,
//               table: payload.table,
//               schema: payload.schema,
//             });

//             queryClient.setQueryData<Checkin[]>(
//               ["checkins", placeId],
//               (old = []) => {
//                 try {
//                   if (payload.eventType === "INSERT" && payload.new) {
//                     const newCheckin = mapCheckinToCamel(
//                       payload.new as DatabaseCheckin,
//                     );

//                     if (old.some((c) => c.id === newCheckin.id)) {
//                       console.log(
//                         "⚠️ [useRealtimeCheckins] Duplicate checkin detected, skipping",
//                       );
//                       return old;
//                     }

//                     const newState = [...old, newCheckin];
//                     console.log(
//                       "✅ [useRealtimeCheckins] Added checkin. New count:",
//                       newState.length,
//                     );
//                     return newState;
//                   }

//                   if (payload.eventType === "UPDATE" && payload.new) {
//                     const updated = mapCheckinToCamel(
//                       payload.new as DatabaseCheckin,
//                     );

//                     const newState = old.map((c) =>
//                       c.id === updated.id ? updated : c,
//                     );
//                     return newState;
//                   }

//                   if (payload.eventType === "DELETE" && payload.old) {
//                     const deletedId = checkinIdSchema.parse(
//                       (payload.old as DatabaseCheckin).id,
//                     );

//                     const newState = old.filter((c) => c.id !== deletedId);
//                     console.log(
//                       "✅ [useRealtimeCheckins] Removed checkin. New count:",
//                       newState.length,
//                     );
//                     return newState;
//                   }

//                   return old;
//                 } catch (error) {
//                   console.error(
//                     "❌ [useRealtimeCheckins] Real-time update error:",
//                     error,
//                   );
//                   return old;
//                 }
//               },
//             );
//           },
//         )
//         .subscribe((status) => {
//           console.log("📡 [useRealtimeCheckins] Subscription status:", status);

//           if (status === "SUBSCRIBED") {
//             console.log(
//               "✅ [useRealtimeCheckins] Successfully subscribed to real-time",
//             );
//             // ✅ RESET SUBSCRIBING FLAG ON SUCCESS
//             isSubscribingRef.current = false;
//           } else if (status === "CHANNEL_ERROR") {
//             console.error("❌ [useRealtimeCheckins] Channel error");
//             // ✅ RESET SUBSCRIBING FLAG ON ERROR
//             isSubscribingRef.current = false;
//           } else if (status === "TIMED_OUT") {
//             console.warn("⏱️ [useRealtimeCheckins] Subscription timed out");
//             // ✅ RESET SUBSCRIBING FLAG ON TIMEOUT
//             isSubscribingRef.current = false;
//           } else if (status === "CLOSED") {
//             console.log("🔌 [useRealtimeCheckins] Subscription closed");
//             // ✅ RESET SUBSCRIBING FLAG ON CLOSE
//             isSubscribingRef.current = false;
//           }
//         });

//       channelRef.current = channel;
//       console.log("📺 [useRealtimeCheckins] Channel stored in ref");
//     } catch (error) {
//       console.error(
//         "❌ [useRealtimeCheckins] Error creating subscription:",
//         error,
//       );
//       isSubscribingRef.current = false; // ✅ RESET FLAG ON ERROR
//     }

//     return () => {
//       console.log("🔌 [useRealtimeCheckins] Cleanup: Starting cleanup");

//       // Reset subscribing flag
//       isSubscribingRef.current = false;

//       if (channelRef.current) {
//         console.log(
//           "🔌 [useRealtimeCheckins] Cleanup: Unsubscribing from channel",
//         );
//         try {
//           supabase.removeChannel(channelRef.current);
//         } catch (error) {
//           console.warn("⚠️ [useRealtimeCheckins] Cleanup error:", error);
//         }
//         channelRef.current = null;
//       }
//     };
//   }, [placeId, queryClient]);

//   return query;
// }
