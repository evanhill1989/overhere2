"use client";

import { useState, useEffect } from "react";
import type { SelectCheckin } from "@/db/schema";
import { createOrGetChatSession } from "@/app/_actions/chatActions";
import ChatWindow from "./ChatWindow";
// Import Supabase client stuff
import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from "@supabase/supabase-js";

import type { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";

// Define the RealtimePayload structure again
interface RealtimePayload<T = unknown> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
  errors: string[] | null;
}

type ChatSessionRow = Tables<"chat_sessions">;

interface InteractiveCheckinListProps {
  otherCheckins: SelectCheckin[];
  placeId: string;
  currentUserCheckinId: number | null;
}

// Initialize Supabase client (consider moving to a shared utility file)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Failed to create Supabase client:", e);
  }
} else {
  console.error("Supabase environment variables missing.");
}

export default function CheckinAndChatController({
  otherCheckins,
  placeId,
  currentUserCheckinId,
}: InteractiveCheckinListProps) {
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(
    null
  );
  const [chatPartnerCheckinId, setChatPartnerCheckinId] = useState<
    number | null
  >(null);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chatRequests, setChatRequests] = useState<ChatSessionRow[]>([]);
  const [pendingOutgoingRequests, setPendingOutgoingRequests] = useState<
    Array<{ receiverCheckinId: number; sessionId: string }>
  >([]);

  // Effect for Subscribing to Chat Request Notifications
  // State variables assumed to exist from your component:

  useEffect(() => {
    // Guard clauses: Ensure Supabase client and user check-in ID are available
    if (!supabase || !currentUserCheckinId) {
      console.log(
        "Supabase client or currentUserCheckinId missing, skipping subscription."
      );
      return;
    }

    // Define a single handler for all relevant postgres changes on chat_sessions
    const handlePostgresChanges = (
      payload: RealtimePayload<ChatSessionRow>
    ) => {
      console.log(`Postgres Change Received (${payload.eventType}):`, payload);

      // --- Handle INSERT events (potential incoming requests) ---
      if (payload.eventType === "INSERT" && payload.new) {
        const newSession = payload.new;
        // Check if this new session is directed *to* the current user
        if (newSession.receiver_checkin_id === currentUserCheckinId) {
          console.log("Processing new INCOMING chat request:", newSession);
          setChatRequests((currentRequests) => {
            // Add if not already present (prevent duplicates if somehow received twice)
            if (!currentRequests.some((req) => req.id === newSession.id)) {
              return [...currentRequests, newSession];
            }
            return currentRequests;
          });
        }
      }
      // --- Handle UPDATE events (potential acceptance of *your* outgoing request) ---
      else if (payload.eventType === "UPDATE" && payload.new) {
        const updatedSession = payload.new;
        // Check if this session was initiated *by* the current user
        // AND if its status now indicates acceptance (e.g., changed to 'active')
        // Adapt 'active' based on your actual database status value for accepted chats
        if (
          updatedSession.initiator_checkin_id === currentUserCheckinId &&
          updatedSession.status === "active" && // <<< Check for accepted status
          // Optional: Check if the status actually changed from the old record if available
          payload.old?.status !== "active"
        ) {
          console.log(
            `Chat session ${updatedSession.id} initiated by you was accepted!`
          );

          // Set state to open the ChatWindow
          setActiveChatSessionId(updatedSession.id);
          setChatPartnerCheckinId(updatedSession.receiver_checkin_id);

          // Remove from pending outgoing requests state, as it's now active
          setPendingOutgoingRequests((prev) =>
            prev.filter((req) => req.sessionId !== updatedSession.id)
          );

          // Optional: Might want to clear any incoming request notification from this user too
          setChatRequests((prev) =>
            prev.filter(
              (r) =>
                r.initiator_checkin_id !== updatedSession.receiver_checkin_id
            )
          );
        }
      }
      // --- Handle DELETE events (optional cleanup) ---
      else if (payload.eventType === "DELETE" && payload.old) {
        const deletedSessionId = payload.old?.id;
        if (deletedSessionId) {
          console.log("Processing DELETED chat session:", payload.old);
          // Remove from incoming requests if it was there
          setChatRequests((currentRequests) =>
            currentRequests.filter((req) => req.id !== deletedSessionId)
          );
          // Remove from pending outgoing requests if it was there
          setPendingOutgoingRequests((prev) =>
            prev.filter((req) => req.sessionId !== deletedSessionId)
          );
          // Optional: If this deleted session *was* the active one, close the chat window
          // if (activeChatSessionId === deletedSessionId) {
          //    setActiveChatSessionId(null);
          //    setChatPartnerCheckinId(null);
          // }
        }
      }
    };

    // Create a unique channel name for this user's chat-related subscriptions
    const channelName = `realtime_chat_user_${currentUserCheckinId}`;
    console.log(`Attempting to subscribe to channel: ${channelName}`);
    const channel = supabase
      .channel(channelName)
      .on<ChatSessionRow>(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "chat_sessions",
          // Filter for sessions WHERE the current user is EITHER the initiator OR the receiver
          // Supabase uses comma (,) as OR for filters on the same column,
          // and separate filters implicitly ANDed. Check exact syntax if needed.
          // This filter might need refinement based on performance / exact Supabase behavior.
          // A simpler approach might be two separate listeners if this filter is problematic.
          filter: `receiver_checkin_id=eq.${currentUserCheckinId},initiator_checkin_id=eq.${currentUserCheckinId}`,
        },
        handlePostgresChanges // Use the unified handler
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(
            `Successfully subscribed to channel ${channelName} for checkinId: ${currentUserCheckinId}`
          );
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            `Subscription error on ${channelName} for checkinId ${currentUserCheckinId}:`,
            err || status
          );
          setErrorMessage(
            "Realtime connection issue. Chat features may be delayed."
          );
        } else if (err) {
          console.error(
            `Subscription error on ${channelName} for checkinId ${currentUserCheckinId}:`,
            err
          );
          setErrorMessage(
            "Realtime connection issue. Chat features may be delayed."
          );
        }
      });

    return () => {
      if (channel && supabase) {
        console.log(
          `Unsubscribing from channel ${channelName} for checkinId: ${currentUserCheckinId}`
        );
        supabase
          .removeChannel(channel)
          .then(() =>
            console.log(`Successfully removed channel ${channelName}`)
          )
          .catch((err) =>
            console.error(`Error removing channel ${channelName}:`, err)
          );
      } else {
        console.log(
          `No channel found to unsubscribe for checkinId: ${currentUserCheckinId} during cleanup.`
        );
      }
    };
  }, [currentUserCheckinId, supabase]);

  const handleInitiateChat = async (receiverCheckin: SelectCheckin) => {
    if (!currentUserCheckinId || isLoadingChat) return;

    setIsLoadingChat(true);
    setErrorMessage(null);

    setChatPartnerCheckinId(null);

    const result = await createOrGetChatSession(
      currentUserCheckinId,
      receiverCheckin.id,
      placeId
    );

    if (result.error || !result.sessionId) {
      console.error("Failed to create/get chat session:", result.error);
      setErrorMessage(result.error || "Could not start chat.");
      setTimeout(() => setErrorMessage(null), 3500);
    } else {
      // setActiveChatSessionId(result.sessionId);
      // setChatPartnerCheckinId(receiverCheckin.id);
      setPendingOutgoingRequests((prev) => [
        ...prev,
        { receiverCheckinId: receiverCheckin.id, sessionId: result.sessionId! },
      ]);

      setErrorMessage(null);

      setChatRequests((prev) =>
        prev.filter(
          (req) =>
            !(
              req.initiator_checkin_id === receiverCheckin.id ||
              req.receiver_checkin_id === receiverCheckin.id
            )
        )
      );
    }
    setIsLoadingChat(false);
  };

  // Function to accept a chat request
  const handleAcceptChat = (request: ChatSessionRow) => {
    if (isLoadingChat) return; // Don't accept if already trying to initiate
    setActiveChatSessionId(request.id);
    setChatPartnerCheckinId(request.initiator_checkin_id); // The initiator is the partner
    setChatRequests((prev) => prev.filter((r) => r.id !== request.id)); // Remove accepted request
    setErrorMessage(null); // Clear any previous errors
  };

  // --- Conditional Rendering Logic ---

  // 1. Render Active Chat Window if session is active
  if (activeChatSessionId && chatPartnerCheckinId && currentUserCheckinId) {
    return (
      <ChatWindow
        sessionId={activeChatSessionId}
        currentUserCheckinId={currentUserCheckinId}
        partnerCheckinId={chatPartnerCheckinId}
        onClose={() => {
          setActiveChatSessionId(null);
          setChatPartnerCheckinId(null);
        }}
      />
    );
  }

  return (
    <section className="mt-6 space-y-5">
      {" "}
      {/* Added space between sections */}
      {/* Display Incoming Chat Requests */}
      {chatRequests.length > 0 && (
        <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md shadow dark:bg-yellow-900/30 dark:border-yellow-700">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-sm">
            {chatRequests.length === 1
              ? "New Chat Request!"
              : `${chatRequests.length} New Chat Requests!`}
          </h3>
          <ul className="space-y-2">
            {chatRequests.map((request) => (
              <li
                key={request.id}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-yellow-900 dark:text-yellow-100">
                  Someone wants to chat.
                </span>
                <div>
                  <Button
                    onClick={() => handleAcceptChat(request)}
                    className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-400"
                    disabled={isLoadingChat}
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() =>
                      setChatRequests((prev) =>
                        prev.filter((r) => r.id !== request.id)
                      )
                    }
                    className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 ml-1"
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* General Error Message Area */}
      {errorMessage && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {errorMessage}
        </div>
      )}
      {/* List of Other Users */}
      <div>
        <h2 className="text-xl font-semibold mb-3 dark:text-white">
          Checked In Nearby
        </h2>
        {otherCheckins.length === 0 &&
          chatRequests.length === 0 &&
          !errorMessage && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-gray-600 dark:text-gray-400 italic">
                No one else is checked in right now.
              </p>
            </div>
          )}

        {otherCheckins.length > 0 && (
          <ul className="space-y-3">
            {otherCheckins.map((checkin) => {
              const isPending = pendingOutgoingRequests.some(
                (req) => req.receiverCheckinId === checkin.id
              );

              return (
                <li
                  key={checkin.id}
                  className={`p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center transition-opacity ${
                    isLoadingChat && !isPending
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                >
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        checkin.status === "available"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                      }`}
                    >
                      {checkin.status === "available" ? "Available" : "Busy"}
                    </span>
                    {checkin.topic ? (
                      <span className="text-gray-800 dark:text-gray-200 italic">
                        {checkin.topic}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Open to general chat
                      </span>
                    )}
                  </div>
                  {checkin.status === "available" && !isPending && (
                    <button
                      onClick={() => handleInitiateChat(checkin)}
                      disabled={isLoadingChat || !currentUserCheckinId}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={
                        !currentUserCheckinId
                          ? "Check in to start chatting"
                          : "Start a chat"
                      }
                    >
                      {isLoadingChat ? "Starting..." : "Say Hi"}
                    </button>
                  )}
                  {isPending && (
                    <Button
                      disabled={true} // Button is disabled
                      className="px-3 py-1 bg-gray-400 text-white text-sm rounded cursor-default" // Different styling
                    >
                      Request Pending
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
