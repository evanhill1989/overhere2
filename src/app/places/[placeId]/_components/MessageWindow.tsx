// // app/places/[placeId]/_components/ChatWindow.tsx
// "use client";

// import React, { useState, useEffect, useRef } from "react";
// // Import Supabase client creator and types
// import {
//   createClient,
//   SupabaseClient,
//   RealtimeChannel,
// } from "@supabase/supabase-js";
// import { sendMessage } from "@/app/_actions/chatActions";

// // Define a simple type for messages received/stored in state (matches Supabase snake_case)
// interface Message {
//   id: number;
//   chat_session_id: string;
//   sender_checkin_id: number;
//   content: string;
//   created_at: string; // ISO String timestamp
// }

// interface MessageWindowProps {
//   sessionId: string;
//   currentUserCheckinId: number;
//   partnerCheckinId: number; // Keep if needed for context/UI
//   onClose: () => void;
// }

// // Initialize Supabase client (outside component or using useMemo for stability)
// // Ensure env vars are properly configured in your Next.js project
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// let supabase: SupabaseClient | null = null;
// if (supabaseUrl && supabaseAnonKey) {
//   try {
//     supabase = createClient(supabaseUrl, supabaseAnonKey);
//   } catch (e) {
//     console.error("Failed to create Supabase client:", e);
//   }
// } else {
//   console.error(
//     "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set."
//   );
// }

// export default function MessageWindow({
//   sessionId,
//   currentUserCheckinId,

//   onClose,
// }: MessageWindowProps) {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [newMessage, setNewMessage] = useState<string>("");
//   const [isSending, setIsSending] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
//   const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

//   // --- useEffect for Fetching Initial Messages & Realtime Subscription ---
//   useEffect(() => {
//     // Ensure Supabase client is available and we have a session ID
//     if (!supabase || !sessionId) {
//       setError("Chat client not ready or session missing.");
//       setIsLoadingInitial(false);
//       console.error(
//         "Aborting effect: Supabase client or sessionId unavailable."
//       );
//       return;
//     }

//     let channel: RealtimeChannel | null = null;

//     // Function to fetch initial messages
//     const fetchInitialMessages = async () => {
//       console.log(`Workspaceing initial messages for session: ${sessionId}`);
//       setIsLoadingInitial(true);
//       setError(null); // Clear previous errors
//       try {
//         const { data, error: fetchError } = await supabase
//           .from("messages") // Use your actual table name
//           .select("*")
//           .eq("chat_session_id", sessionId) // Filter by the correct session ID column
//           .order("created_at", { ascending: true }); // Get messages in chronological order

//         if (fetchError) {
//           throw fetchError;
//         }

//         console.log("Fetched initial messages:", data);
//         setMessages(data || []); // Update state with fetched messages
//       } catch (err: unknown) {
//         console.error("Error fetching initial messages:", err);
//         setError(`Failed to load messages: ${err}`);
//         setMessages([]);
//       } finally {
//         setIsLoadingInitial(false);
//       }
//     };

//     // Call the fetch function
//     fetchInitialMessages();

//     // Set up Realtime subscription for new messages
//     console.log(`Setting up subscription for session: ${sessionId}`);
//     channel = supabase
//       .channel(`chat_session_${sessionId}`) // Unique channel name per session
//       .on(
//         "postgres_changes", // Listen to database changes
//         {
//           event: "INSERT", // Specifically for new messages
//           schema: "public", // Your schema
//           table: "messages", // Your messages table
//           filter: `chat_session_id=eq.${sessionId}`, // Filter for this session server-side
//         },
//         (payload) => {
//           console.log("New message received via subscription:", payload.new);
//           // Append the new message to the existing messages state
//           // Ensure the payload structure matches your Message interface
//           setMessages((currentMessages) => {
//             // Avoid adding duplicates if fetch happened around the same time
//             if (
//               currentMessages.some(
//                 (msg) => msg.id === (payload.new as Message).id
//               )
//             ) {
//               return currentMessages;
//             }
//             return [...currentMessages, payload.new as Message];
//           });
//         }
//       )
//       .subscribe((status, err) => {
//         // Callback for subscription status changes
//         if (status === "SUBSCRIBED") {
//           console.log(
//             `Successfully subscribed to channel: chat_session_${sessionId}`
//           );
//         }
//         if (status === "CHANNEL_ERROR" || err) {
//           console.error("Subscription Error:", err);
//           setError("Chat connection error. Please refresh.");
//           // Optionally try to resubscribe or alert user
//         }
//         if (status === "TIMED_OUT") {
//           console.warn("Subscription timed out.");
//           setError("Chat connection timed out. Please refresh.");
//         }
//       });

//     // Cleanup function: This runs when the component unmounts or sessionId changes
//     return () => {
//       if (channel && supabase) {
//         console.log(`Unsubscribing from channel: ${channel.topic}`);
//         supabase
//           .removeChannel(channel)
//           .catch((err) =>
//             console.error("Error unsubscribing from channel:", err)
//           );
//         channel = null; // Clear reference
//       }
//     };
//   }, [sessionId]); // Re-run this effect if the sessionId changes

//   // --- Auto-scrolling logic ---
//   useEffect(() => {
//     // Scroll to the bottom whenever the messages array changes
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   //   const handleSend = async () => {
//   //     // --- TODO: Implement call to 'sendMessage' server action ---
//   //     if (!newMessage.trim() || isSending || !supabase) return;
//   //     setIsSending(true);
//   //     setError(null);

//   //     console.log(`Calling sendMessage action for session ${sessionId}`);
//   //     // const result = await sendMessage(sessionId, currentUserCheckinId, newMessage);

//   //     // Mockup for now:
//   //     await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate delay
//   //     const result = { success: true }; // Assume success for now

//   //     if (result.error) {
//   //       setError(result.error);
//   //     } else {
//   //       setNewMessage(""); // Clear input ONLY on successful send confirmed by action
//   //     }
//   //     setIsSending(false);
//   //     // --- End of TODO ---
//   //   };

//   const handleSend = async () => {
//     const trimmedMessage = newMessage.trim();
//     // Prevent sending empty messages, while already sending, or if setup failed
//     if (
//       !trimmedMessage ||
//       isSending ||
//       !supabase ||
//       !sessionId ||
//       !currentUserCheckinId
//     ) {
//       return;
//     }

//     setIsSending(true);
//     setError(null); // Clear previous errors before sending

//     try {
//       // Call the server action from chatActions.ts
//       const result = await sendMessage(
//         sessionId,
//         currentUserCheckinId,
//         trimmedMessage
//       );

//       if (result.error) {
//         // If the server action returned an error, display it
//         console.error("sendMessage action failed:", result.error);
//         setError(result.error);
//         // Don't clear the input - let the user retry or edit
//       } else {
//         // If the server action succeeded, clear the input field
//         console.log("sendMessage action successful.");
//         setNewMessage("");
//         // The message will appear automatically via the Realtime subscription listening for DB inserts
//       }
//     } catch (err: unknown) {
//       // Catch unexpected errors (e.g., network issue calling the action)
//       console.error("Error calling sendMessage action:", err);
//       setError("Failed to send message due to a network or server issue.");
//     } finally {
//       // Always reset the sending state
//       setIsSending(false);
//     }
//   };

//   // --- JSX Rendering ---
//   return (
//     <div className="mt-6 border rounded-lg p-4 shadow-md bg-white dark:bg-gray-800 dark:border-gray-700">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-gray-600">
//         <h3 className="text-lg font-semibold dark:text-white">Chat</h3>
//         <button
//           onClick={onClose}
//           className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
//           title="Close Chat"
//         >
//           &times; Close
//         </button>
//       </div>
//       {/* Message Display */}
//       <div
//         className="h-48 overflow-y-auto mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600"
//         aria-live="polite"
//       >
//         {isLoadingInitial && (
//           <p className="text-gray-400 text-center text-sm italic py-4">
//             Loading messages...
//           </p>
//         )}
//         {!isLoadingInitial &&
//           messages.length === 0 &&
//           !error && ( // Added !error check
//             <p className="text-gray-400 text-center text-sm italic py-4">
//               No messages yet. Say hello!
//             </p>
//           )}
//         {!isLoadingInitial &&
//           error && ( // Display error during initial load
//             <p className="text-red-500 text-center text-sm italic py-4">
//               {error}
//             </p>
//           )}
//         {!isLoadingInitial &&
//           messages.map((msg) => (
//             <div
//               key={msg.id}
//               className={`mb-2 flex ${
//                 msg.sender_checkin_id === currentUserCheckinId
//                   ? "justify-end"
//                   : "justify-start"
//               }`}
//             >
//               <span
//                 className={`inline-block max-w-[80%] px-3 py-1.5 rounded-lg text-sm break-words shadow ${
//                   msg.sender_checkin_id === currentUserCheckinId
//                     ? "bg-blue-500 text-white"
//                     : "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-50"
//                 }`}
//               >
//                 {msg.content}
//               </span>
//             </div>
//           ))}
//         {/* Empty div at the end to ensure scrolling works */}
//         <div ref={messagesEndRef} />
//       </div>
//       {/* Message Input */}
//       <form
//         onSubmit={(e) => {
//           e.preventDefault();
//           handleSend();
//         }}
//         className="flex gap-2"
//       >
//         {" "}
//         <input
//           type="text"
//           aria-label="Chat message input" // Accessibility
//           placeholder="Type your message..."
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//           className="flex-grow p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400"
//           disabled={isSending || !supabase || !!error} // Disable if sending, no client, or error occurred
//         />
//         <button
//           type="submit" // Use type submit
//           className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
//           disabled={!newMessage.trim() || isSending || !supabase || !!error}
//         >
//           {isSending ? "Sending..." : "Send"}
//         </button>
//       </form>
//       {error && !isLoadingInitial && (
//         <p className="text-xs text-red-500 mt-1">{error}</p>
//       )}{" "}
//     </div>
//   );
// }
