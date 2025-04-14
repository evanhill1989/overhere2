// app/places/[placeId]/_components/InteractiveCheckinList.tsx
"use client";

import { useState, useEffect } from "react"; // Added useEffect
import type { SelectCheckin, SelectChatSession } from "@/db/schema"; // Added SelectChatSession
import { createOrGetChatSession } from "@/app/_actions/chatActions";
import ChatWindow from "./ChatWindow";
// Import Supabase client stuff
import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from "@supabase/supabase-js";

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

export default function InteractiveCheckinList({
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
  const [chatRequests, setChatRequests] = useState<SelectChatSession[]>([]); // State for notifications

  // Effect for Subscribing to Chat Request Notifications
  useEffect(() => {
    if (!supabase || !currentUserCheckinId) return;

    let channel: RealtimeChannel | null = null;

    const handleChatRequest = (payload: any) => {
      console.log("Chat request received:", payload.new);
      const newSession = payload.new as SelectChatSession;
      setChatRequests((currentRequests) => {
        // Add if not already present
        if (!currentRequests.some((req) => req.id === newSession.id)) {
          return [...currentRequests, newSession];
        }
        return currentRequests;
      });
    };

    channel = supabase
      .channel(`chat_notifications_for_${currentUserCheckinId}`)
      .on<SelectChatSession>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_sessions",
          filter: `receiver_checkin_id=eq.${currentUserCheckinId}`, // Listen for sessions where I'm the receiver
        },
        handleChatRequest
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(
            `Subscribed to notifications for checkinId: ${currentUserCheckinId}`
          );
        } else if (err) {
          console.error(
            `Notification subscription error for checkinId ${currentUserCheckinId}:`,
            err
          );
          setErrorMessage("Could not listen for chat requests."); // Show error feedback
        }
      });

    // Cleanup
    return () => {
      if (channel && supabase) {
        console.log(
          `Unsubscribing from notifications for checkinId: ${currentUserCheckinId}`
        );
        supabase
          .removeChannel(channel)
          .catch((err) =>
            console.error("Error unsubscribing from notifications:", err)
          );
        channel = null;
      }
    };
  }, [currentUserCheckinId]); // Depend on currentUserCheckinId

  // Function to initiate a chat
  const handleInitiateChat = async (receiverCheckin: SelectCheckin) => {
    if (!currentUserCheckinId || isLoadingChat) return;

    setIsLoadingChat(true);
    setErrorMessage(null);
    setActiveChatSessionId(null); // Clear any previous active chat
    setChatPartnerCheckinId(null);

    const result = await createOrGetChatSession(
      currentUserCheckinId,
      receiverCheckin.id,
      placeId
    );

    if (result.error || !result.sessionId) {
      console.error("Failed to create/get chat session:", result.error);
      setErrorMessage(result.error || "Could not start chat.");
      setTimeout(() => setErrorMessage(null), 3500); // Auto-clear error
    } else {
      setActiveChatSessionId(result.sessionId);
      setChatPartnerCheckinId(receiverCheckin.id);
      setErrorMessage(null);
      // Clear any pending requests involving this partner if I initiated
      setChatRequests((prev) =>
        prev.filter(
          (req) =>
            !(
              req.initiatorCheckinId === receiverCheckin.id ||
              req.receiverCheckinId === receiverCheckin.id
            )
        )
      );
    }
    setIsLoadingChat(false);
  };

  // Function to accept a chat request
  const handleAcceptChat = (request: SelectChatSession) => {
    if (isLoadingChat) return; // Don't accept if already trying to initiate
    setActiveChatSessionId(request.id);
    setChatPartnerCheckinId(request.initiatorCheckinId); // The initiator is the partner
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

  // 2. If no active chat, render notifications and the list
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
                  <button
                    onClick={() => handleAcceptChat(request)}
                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-400"
                    disabled={isLoadingChat}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      setChatRequests((prev) =>
                        prev.filter((r) => r.id !== request.id)
                      )
                    }
                    className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 ml-1"
                  >
                    Dismiss
                  </button>
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
            {otherCheckins.map((checkin) => (
              <li
                key={checkin.id}
                className={`p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center transition-opacity ${
                  isLoadingChat ? "opacity-50 pointer-events-none" : ""
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
                      "{checkin.topic}"
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      Open to general chat
                    </span>
                  )}
                </div>
                {checkin.status === "available" && (
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
