// useEffect(() => {
//     // Guard clauses
//     if (!supabase || !currentUserCheckinId) {
//       console.log("Supabase client or currentUserCheckinId missing, skipping subscription.");
//       return;
//     }

//     // REMOVED the unused handlePostgresChanges function definition

//     const channelName = `realtime_chat_user_${currentUserCheckinId}`;
//     console.log(`Attempting to subscribe to channel: ${channelName}`);
//     const channel = supabase.channel(channelName);

//     // Listener 1: For new INCOMING chat requests (INSERT where I am receiver)
//     channel.on<ChatSessionRow>(
//         'postgres_changes',
//         {
//             event: 'INSERT',
//             schema: 'public',
//             table: 'chat_sessions',
//             filter: `receiver_checkin_id=eq.${currentUserCheckinId}`
//         },
//         (payload) => {
//             // Handler for incoming inserts (seems correct)
//             console.log('Incoming Request (INSERT):', payload);
//             if (payload.new) {
//                 const newSession = payload.new;
//                 setChatRequests((currentRequests) => {
//                     if (!currentRequests.some((req) => req.id === newSession.id)) {
//                         return [...currentRequests, newSession];
//                     }
//                     return currentRequests;
//                 });
//             }
//         }
//     );

//     // Listener 2: For updates on chats I INITIATED (e.g., receiver accepted/rejected)
//     channel.on<ChatSessionRow>(
//         'postgres_changes',
//         {
//             event: 'UPDATE',
//             schema: 'public',
//             table: 'chat_sessions',
//             filter: `initiator_checkin_id=eq.${currentUserCheckinId}`
//         },
//         (payload) => {
//             // Handler for updates on sessions I initiated
//             console.log('My Outgoing Session Update (UPDATE):', payload);
//             if (payload.new) {
//                 const updatedSession = payload.new;

//                 // Check for ACCEPTANCE (Removed payload.old.status check)
//                 if (updatedSession.status === 'active') {
//                      // Optional: Add client check if already processing this to prevent flicker
//                      // if (activeChatSessionId === updatedSession.id) return;

//                     console.log(`Chat session ${updatedSession.id} accepted by receiver!`);
//                     setActiveChatSessionId(updatedSession.id);
//                     setChatPartnerCheckinId(updatedSession.receiver_checkin_id);
//                     setPendingOutgoingRequests(prev => prev.filter(req => req.sessionId !== updatedSession.id));
//                     setChatRequests((prev) => prev.filter((r) => r.initiator_checkin_id !== updatedSession.receiver_checkin_id));
//                 }
//                 // Check for REJECTION (Removed payload.old.status check)
//                 else if (updatedSession.status === 'rejected') {
//                     console.log(`Chat session ${updatedSession.id} rejected by receiver.`);
//                     setPendingOutgoingRequests(prev => prev.filter(req => req.sessionId !== updatedSession.id));
//                     toast({ // Assuming toast is initialized via useToast()
//                         title: "Request Dismissed",
//                         description: "The other user dismissed your chat request.",
//                     });
//                 }
//                  // Handle other status updates if needed
//             }
//         }
//     );

//     // Listener 3: For DELETES of sessions I was involved in (Listen broadly, filter client-side)
//     channel.on<ChatSessionRow>(
//         'postgres_changes',
//         {
//             event: 'DELETE',
//             schema: 'public',
//             table: 'chat_sessions',
//             // No server-side filter, as payload.old only has ID
//         },
//         (payload) => {
//             console.log('Chat Session Potentially Deleted:', payload.old);
//             // payload.old ONLY contains the primary key (id) reliably here
//             const deletedSessionId = payload.old?.id;

//             if (deletedSessionId && currentUserCheckinId) {
//                  // Check local state to see if this delete affects us
//                  const relevantIncoming = chatRequests.some(req => req.id === deletedSessionId);
//                  const relevantOutgoing = pendingOutgoingRequests.some(req => req.sessionId === deletedSessionId);
//                  // You might need a way to check if it was the *active* chat session ID
//                  // const relevantActive = activeChatSessionId === deletedSessionId;

//                  if (relevantIncoming || relevantOutgoing /*|| relevantActive*/) {
//                      console.log(`Processing DELETE event for relevant session: ${deletedSessionId}`);
//                      // Perform cleanup using the ID
//                      setChatRequests((currentRequests) => currentRequests.filter((req) => req.id !== deletedSessionId));
//                      setPendingOutgoingRequests((prev) => prev.filter((req) => req.sessionId !== deletedSessionId));
//                      // if (relevantActive) { /* Close chat window logic */ }
//                  } else {
//                       console.log("Ignoring DELETE event not relevant to current user's active/pending state.");
//                  }
//             } else {
//                 console.log("Ignoring DELETE event due to missing ID or user ID.");
//             }
//         }
//     );

//     // Subscribe AFTER setting up all listeners
//     channel.subscribe((status, err) => {
//         if (status === 'SUBSCRIBED') {
//             console.log(`Successfully subscribed to channel ${channelName} with multiple listeners`);
//         } else if (err) {
//             console.error(`Subscription error on ${channelName}:`, err);
//             setErrorMessage("Realtime connection issue.");
//         }
//         // Handle other statuses like CHANNEL_ERROR, TIMED_OUT
//     });

//     // Cleanup function
//     return () => {
//         if (channel && supabase) {
//             console.log(`Unsubscribing from channel ${channelName}`);
//             supabase.removeChannel(channel)
//               .then(() => console.log(`Successfully removed channel ${channelName}`))
//               .catch(err => console.error(`Error removing channel ${channelName}:`, err));
//         }
//     };
//   // Add 'toast' to dependency array if it's from useToast hook
// }, [currentUserCheckinId, supabase, toast, activeChatSessionId, chatRequests, pendingOutgoingRequests]); // Added potentially relevant state dependencies
