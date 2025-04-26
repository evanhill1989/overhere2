"use client";

import { useState, useEffect } from "react";
import type { SelectCheckin } from "@/db/schema";
import {
  acceptChatSession,
  createOrGetChatSession,
  rejectChatSession,
} from "@/app/_actions/chatActions";
import ChatWindow from "./ChatWindow";
// Import Supabase client stuff
import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from "@supabase/supabase-js";

import type { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

    // Create a unique channel name for this user's chat-related subscriptions
    const channelName = `realtime_chat_user_${currentUserCheckinId}`;
    console.log(`Attempting to subscribe to channel: ${channelName}`);
    const channel = supabase.channel(channelName);

    // Listener 1: For new INCOMING chat requests (INSERT where I am receiver)
    channel.on<ChatSessionRow>(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_sessions",
        filter: `receiver_checkin_id=eq.${currentUserCheckinId}`, // Filter: I am the receiver
      },
      (payload) => {
        console.log("Incoming Request (INSERT):", payload);
        if (payload.new) {
          const newSession = payload.new;
          // Add to chat requests state
          setChatRequests((currentRequests) => {
            if (!currentRequests.some((req) => req.id === newSession.id)) {
              return [...currentRequests, newSession];
            }
            return currentRequests;
          });
        }
      }
    );

    // Listener 2: For updates on chats I INITIATED (e.g., receiver accepted)
    channel.on<ChatSessionRow>(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_sessions",
        filter: `initiator_checkin_id=eq.${currentUserCheckinId}`, // Filter: I am the initiator
      },
      (payload) => {
        console.log("My Outgoing Session Update (UPDATE):", payload);
        if (payload.new) {
          const updatedSession = payload.new;
          // Check if the status is now 'active' (meaning accepted)
          if (updatedSession.status === "active") {
            console.log(
              `Chat session ${updatedSession.id} accepted by receiver!`
            );

            setActiveChatSessionId(updatedSession.id);
            setChatPartnerCheckinId(updatedSession.receiver_checkin_id);
            setPendingOutgoingRequests((prev) =>
              prev.filter((req) => req.sessionId !== updatedSession.id)
            );
            setChatRequests((prev) =>
              prev.filter(
                (r) =>
                  r.initiator_checkin_id !== updatedSession.receiver_checkin_id
              )
            );
          } else if (updatedSession.status === "rejected") {
            console.log(
              `Chat session ${updatedSession.id} rejected by receiver.`
            );

            setPendingOutgoingRequests((prev) =>
              prev.filter((req) => req.sessionId !== updatedSession.id)
            );
            toast("Your chat request was dismissed.");
          }
          // Handle other status updates if needed (e.g., 'closed')
        }
      }
    );

    channel.on<ChatSessionRow>(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "chat_sessions",
      },
      (payload) => {
        console.log("Chat Session Potentially Deleted:", payload.old);

        const deletedSessionId = payload.old?.id;

        // Check if the deleted session involved the current user
        if (deletedSessionId && currentUserCheckinId) {
          const relevantIncoming = chatRequests.some(
            (req) => req.id === deletedSessionId
          );
          const relevantOutgoing = pendingOutgoingRequests.some(
            (req) => req.sessionId === deletedSessionId
          );
          if (relevantIncoming || relevantOutgoing /*|| relevantActive*/) {
            console.log(
              `Processing DELETE event for relevant session: ${deletedSessionId}`
            );
            // Perform cleanup using the ID
            setChatRequests((currentRequests) =>
              currentRequests.filter((req) => req.id !== deletedSessionId)
            );
            setPendingOutgoingRequests((prev) =>
              prev.filter((req) => req.sessionId !== deletedSessionId)
            );
            // if (relevantActive) { /* Close chat window logic */ }
          } else {
            console.log(
              "Ignoring DELETE event not relevant to current user's active/pending state."
            );
          }
        } else {
          console.log("Ignoring DELETE event not relevant to current user.");
        }
      }
    );
    channel.subscribe((status, err) => {
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
  // Inside InteractiveCheckinList component:

  const handleAcceptChat = async (request: ChatSessionRow) => {
    // Make async
    // Prevent accepting if already loading another chat operation
    if (isLoadingChat) return;

    setIsLoadingChat(true); // Set loading state
    setErrorMessage(null); // Clear previous errors

    try {
      // Call the server action first
      const result = await acceptChatSession(request.id);

      if (result.success) {
        // --- If server action succeeded, update client state ---
        console.log(
          `Successfully accepted session ${request.id} via server action.`
        );
        setActiveChatSessionId(request.id);
        setChatPartnerCheckinId(request.initiator_checkin_id); // The initiator is the partner
        setChatRequests((prev) => prev.filter((r) => r.id !== request.id)); // Remove accepted request from list
        // --- End client state update ---
      } else {
        // Server action failed, show error message
        console.error(
          "Failed to accept chat session via server action:",
          result.error
        );
        setErrorMessage(
          result.error || "Could not accept chat. Please try again."
        );
        // Optionally auto-clear error after some time
        // setTimeout(() => setErrorMessage(null), 3500);
      }
    } catch (error) {
      // Catch unexpected errors during the action call
      console.error("Unexpected error calling acceptChatSession:", error);
      setErrorMessage("An unexpected error occurred while accepting the chat.");
      // Optionally auto-clear error after some time
      // setTimeout(() => setErrorMessage(null), 3500);
    } finally {
      setIsLoadingChat(false); // Clear loading state regardless of success/failure
    }
  };

  const handleDismissRequest = async (request: ChatSessionRow) => {
    // Optional: Add loading state specific to dismissing if needed
    setIsLoadingChat(true); // Reuse general loading state for simplicity
    setErrorMessage(null);

    try {
      // Call the server action to update the status
      const result = await rejectChatSession(request.id);

      if (result.success) {
        console.log(
          `Successfully dismissed session ${request.id} via server action.`
        );
        // Remove from the local state ONLY after server confirms
        setChatRequests((prev) => prev.filter((r) => r.id !== request.id));
      } else {
        console.error(
          "Failed to dismiss chat session via server action:",
          result.error
        );
        setErrorMessage(result.error || "Could not dismiss request.");
        // Maybe add auto-clear for error
      }
    } catch (error) {
      console.error("Unexpected error calling rejectChatSession:", error);
      setErrorMessage(
        "An unexpected error occurred while dismissing the request."
      );
    } finally {
      setIsLoadingChat(false);
    }
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
                    onClick={() => handleDismissRequest(request)}
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
                          ? "Check in to send a message"
                          : "Send a message"
                      }
                    >
                      {isLoadingChat ? "Starting..." : "Send Message"}
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
