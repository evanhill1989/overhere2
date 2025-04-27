"use client";

import { useState, useEffect } from "react";
import type { SelectCheckin } from "@/db/schema";
import {
  acceptChatSession,
  createOrGetChatSession,
  rejectChatSession,
} from "@/app/_actions/chatActions";
import MessageWindow from "./MessageWindow";
// Import Supabase client stuff
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import type { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { transformCheckinRowToSelect } from "@/lib/utils";

// Define the RealtimePayload structure again
// interface RealtimePayload<T = unknown> {
//   schema: string;
//   table: string;
//   commit_timestamp: string;
//   eventType: "INSERT" | "UPDATE" | "DELETE";
//   new: T;
//   old: Partial<T>;
//   errors: string[] | null;
// }

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

export default function CheckinAndMessageController({
  otherCheckins,
  placeId,
  currentUserCheckinId,
}: InteractiveCheckinListProps) {
  const [activeCId, setActiveConnectionId] = useState<string | null>(null);
  const [connectionPartnerCheckinId, setConnectionPartnerCheckinId] = useState<
    number | null
  >(null);
  const [isLoadingConnection, setIsLoadingConnection] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<ChatSessionRow[]>(
    []
  );
  const [pendingOutgoingRequests, setPendingOutgoingRequests] = useState<
    Array<{ receiverCheckinId: number; sessionId: string }>
  >([]);
  const [displayedCheckins, setDisplayedCheckins] =
    useState<SelectCheckin[]>(otherCheckins);

  useEffect(() => {
    // Guard clauses: Ensure Supabase client and user check-in ID are available
    if (!supabase || !currentUserCheckinId || !placeId) {
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
          setIncomingRequests((currentRequests) => {
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

            setActiveConnectionId(updatedSession.id);
            setConnectionPartnerCheckinId(updatedSession.receiver_checkin_id);
            setPendingOutgoingRequests((prev) =>
              prev.filter((req) => req.sessionId !== updatedSession.id)
            );
            setIncomingRequests((prev) =>
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
    // Listener 3: For chat session DELETIONS (e.g., closed or deleted)
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
          const relevantIncoming = incomingRequests.some(
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
            setIncomingRequests((currentRequests) =>
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

    // --- ADD Listeners for Check-in Table Changes ---
    type CheckinRow = Tables<"checkins">; // Use generated type

    // Listener 4: New Check-in Created at this Place
    channel.on<CheckinRow>(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "checkins",
        filter: `place_id=eq.${placeId}`, // Only for this place
      },
      (payload) => {
        console.log("New Check-in Detected (INSERT):", payload.new);
        const newCheckin = payload.new;
        // Add to list ONLY IF it's not the current user's check-in
        // AND it's not already in the list (prevent duplicates)
        if (newCheckin.id !== currentUserCheckinId) {
          const transformedCheckin = transformCheckinRowToSelect(newCheckin);
          if (transformedCheckin) {
            console.log("Transformed Check-in:", transformedCheckin);
            setDisplayedCheckins((prevCheckins) => {
              if (!prevCheckins.some((c) => c.id === newCheckin.id)) {
                console.log(
                  "Adding new check-in to displayed list:",
                  newCheckin
                );
                return [...prevCheckins, transformedCheckin];
              }
              return prevCheckins;
            });
          }
        }
      }
    );

    // Listener 5: Check-in Updated at this Place (e.g., status/topic change)
    channel.on<CheckinRow>(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "checkins",
        filter: `place_id=eq.${placeId}`,
      },
      (payload) => {
        console.log("Check-in Update Detected (UPDATE):", payload.new);
        const updatedCheckin = payload.new;
        if (updatedCheckin) {
          const transformedCheckin =
            transformCheckinRowToSelect(updatedCheckin);
          if (transformedCheckin) {
            // Check if transformation was successful
            setDisplayedCheckins((prevCheckins) =>
              prevCheckins.map((c) =>
                c.id === transformedCheckin.id ? transformedCheckin : c
              )
            );
          }
        }
      }
    );

    // Listener 6: Check-in Deleted at this Place (User left/checked out)
    channel.on<CheckinRow>(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "checkins",
        filter: `place_id=eq.${placeId}`,
        // Note: payload.old for checkins might also only contain the ID (primary key 'id')
      },
      (payload) => {
        console.log("Check-in Deletion Detected (DELETE):", payload.old);
        const deletedCheckinId = payload.old?.id; // ID is usually included in 'old' for DELETE
        if (deletedCheckinId) {
          // Remove the check-in from the displayed list
          setDisplayedCheckins((prevCheckins) =>
            prevCheckins.filter((c) => c.id !== deletedCheckinId)
          );
        }
      }
    );
    // --- End Listeners for Check-in Table Changes ---

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
  }, [
    currentUserCheckinId,
    incomingRequests,
    pendingOutgoingRequests,
    placeId,
  ]); // Ensure dependencies are correct

  const handleInitiateConnection = async (receiverCheckin: SelectCheckin) => {
    if (!currentUserCheckinId || isLoadingConnection) return;

    setIsLoadingConnection(true);
    setErrorMessage(null);

    setConnectionPartnerCheckinId(null);

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
      // setActiveConnectionId(result.sessionId);
      // setConnectionPartnerCheckinId(receiverCheckin.id);
      setPendingOutgoingRequests((prev) => [
        ...prev,
        { receiverCheckinId: receiverCheckin.id, sessionId: result.sessionId! },
      ]);

      setErrorMessage(null);

      setIncomingRequests((prev) =>
        prev.filter(
          (req) =>
            !(
              req.initiator_checkin_id === receiverCheckin.id ||
              req.receiver_checkin_id === receiverCheckin.id
            )
        )
      );
    }
    setIsLoadingConnection(false);
  };

  // Function to accept a chat request
  // Inside InteractiveCheckinList component:

  const handleAcceptConnection = async (request: ChatSessionRow) => {
    // Make async
    // Prevent accepting if already loading another chat operation
    if (isLoadingConnection) return;

    setIsLoadingConnection(true); // Set loading state
    setErrorMessage(null); // Clear previous errors

    try {
      // Call the server action first
      const result = await acceptChatSession(request.id);

      if (result.success) {
        // --- If server action succeeded, update client state ---
        console.log(
          `Successfully accepted session ${request.id} via server action.`
        );
        setActiveConnectionId(request.id);
        setConnectionPartnerCheckinId(request.initiator_checkin_id); // The initiator is the partner
        setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id)); // Remove accepted request from list
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
      setIsLoadingConnection(false); // Clear loading state regardless of success/failure
    }
  };

  const handleDismissRequest = async (request: ChatSessionRow) => {
    // Optional: Add loading state specific to dismissing if needed
    setIsLoadingConnection(true); // Reuse general loading state for simplicity
    setErrorMessage(null);

    try {
      // Call the server action to update the status
      const result = await rejectChatSession(request.id);

      if (result.success) {
        console.log(
          `Successfully dismissed session ${request.id} via server action.`
        );
        // Remove from the local state ONLY after server confirms
        setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
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
      setIsLoadingConnection(false);
    }
  };
  // --- Conditional Rendering Logic ---

  // 1. Render Active Chat Window if session is active
  if (activeCId && connectionPartnerCheckinId && currentUserCheckinId) {
    return (
      <MessageWindow
        sessionId={activeCId}
        currentUserCheckinId={currentUserCheckinId}
        partnerCheckinId={connectionPartnerCheckinId}
        onClose={() => {
          setActiveConnectionId(null);
          setConnectionPartnerCheckinId(null);
        }}
      />
    );
  }

  return (
    <section className="mt-6 space-y-5">
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
        {displayedCheckins.length === 0 &&
          incomingRequests.length === 0 &&
          !errorMessage && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-gray-600 dark:text-gray-400 italic">
                No one else is checked in right now.
              </p>
            </div>
          )}

        {displayedCheckins.length > 0 && (
          <ul className="space-y-3">
            {displayedCheckins.map((checkin) => {
              // --- Determine the state relative to this specific checkin ---

              const pendingOutgoing = pendingOutgoingRequests.find(
                (req) => req.receiverCheckinId === checkin.id
              );
              const isPendingOutgoing = !!pendingOutgoing;

              const incomingRequest = incomingRequests.find(
                (req) => req.initiator_checkin_id === checkin.id
              );
              console.log("Incoming Requests State:", incomingRequest);

              return (
                <li
                  key={checkin.id}
                  className={`p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center transition-opacity ${
                    isLoadingConnection &&
                    !isPendingOutgoing &&
                    !incomingRequest
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
                        Open to connect
                      </span>
                    )}
                  </div>
                  {/* --- Conditional Action Buttons --- */}
                  <div className="flex gap-x-2">
                    {/* Case 1: Incoming Request from this user */}
                    {incomingRequest && (
                      <>
                        <Button
                          variant="outline" // Example style (adjust)
                          size="sm" // Example size
                          onClick={() =>
                            handleAcceptConnection(incomingRequest)
                          }
                          disabled={isLoadingConnection}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost" // Example style (adjust)
                          size="sm"
                          onClick={() => handleDismissRequest(incomingRequest)}
                          disabled={isLoadingConnection}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                    {/* Case 2: Outgoing Request is Pending to this user */}
                    {!incomingRequest && isPendingOutgoing && (
                      <Button
                        disabled={true}
                        variant="secondary"
                        size="sm"
                        className="cursor-default"
                      >
                        Request Pending
                      </Button>
                    )}
                    {/* Case 3: User is Available, no pending/incoming requests */}
                    {!incomingRequest &&
                      !isPendingOutgoing &&
                      checkin.status === "available" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleInitiateConnection(checkin)}
                          disabled={
                            isLoadingConnection || !currentUserCheckinId
                          }
                          title={
                            !currentUserCheckinId
                              ? "Check in to connect"
                              : "Send connection request"
                          }
                        >
                          {isLoadingConnection ? "Sending..." : "Connect"}
                        </Button>
                      )}
                    {/* Case 4: User is Busy, no pending/incoming requests */}
                    {!incomingRequest &&
                      !isPendingOutgoing &&
                      checkin.status === "busy" && (
                        <span className="px-3 py-1 text-gray-500 text-sm italic">
                          Busy
                        </span>
                      )}
                  </div>
                  {/* --- End Conditional Action Buttons --- */}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
