// // Inside CheckinAndChatController.tsx

// export default function CheckinAndChatController({
//     otherCheckins,
//     placeId,
//     currentUserCheckinId,
//     currentUserKindeId, // <-- Destructure the new prop
//   }: CheckinAndChatControllerProps) {

//     // ... state ...

//     useEffect(() => {
//       // Update guard clause
//       if (!supabase || !currentUserCheckinId /* Maybe remove this check? */ || !placeId || !currentUserKindeId /* Add check for kindeId maybe? */ ) {
//            console.log("Dependencies missing, skipping subscription.");
//            // Decide if subscription should run even if user isn't checked in (currentUserCheckinId is null)
//            // If yes, remove currentUserCheckinId from guard. Let's assume yes for now.
//            // If user isn't logged in (currentUserKindeId is null), maybe skip?
//            if (!supabase || !placeId) return; // Simplified guard
//            // return;
//       }

//       const channelName = `realtime_updates_place_${placeId}_user_${currentUserKindeId ?? 'anon'}`; // Adjust name
//       const channel = supabase.channel(channelName);

//       // Listener 4: New Check-in Created
//       channel.on<CheckinRow>(
//           'postgres_changes',
//           { event: 'INSERT', schema: 'public', table: 'checkins', filter: `place_id=eq.${placeId}` },
//           (payload) => {
//               console.log("New Check-in Detected (INSERT):", payload.new);
//               const newCheckin = payload.new; // Type is CheckinRow

//               // --- CORRECTED CHECK ---
//               // Add to list ONLY IF it's not the current logged-in user's check-in
//               if (newCheckin && newCheckin.user_id !== currentUserKindeId) { // Compare user_id to Kinde ID
//                   // --- END CORRECTION ---

//                   const transformedCheckin = transformCheckinRowToSelect(newCheckin);
//                   if (transformedCheckin) {
//                        setDisplayedCheckins(prevCheckins => {
//                           if (!prevCheckins.some(c => c.id === transformedCheckin.id)) {
//                               console.log(`Adding check-in from user ${newCheckin.user_id} to displayed list:`, transformedCheckin);
//                               return [...prevCheckins, transformedCheckin];
//                           }
//                           return prevCheckins;
//                        });
//                   }
//               } else {
//                    console.log(`Ignoring check-in insert (likely self or missing data). Checkin UserID: ${newCheckin?.user_id}, Current User KindeID: ${currentUserKindeId}`);
//               }
//           }
//       );

//       // ... other listeners (UPDATE, DELETE on checkins, listeners for chat_sessions) ...

//       channel.subscribe((status, err) => { /* ... */ });

//       // Cleanup
//       return () => { /* ... remove channel ... */ };

//     // Add props used in logic/filters to dependency array
//     }, [currentUserCheckinId, currentUserKindeId, supabase, placeId, toast]); // Added currentUserKindeId, placeId

//   // ... rest of component ...
//   }
