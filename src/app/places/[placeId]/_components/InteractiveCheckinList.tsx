// app/places/[placeId]/_components/InteractiveCheckinList.tsx
"use client";

import { useState } from "react";
import type { SelectCheckin } from "@/db/schema"; // Adjust path
import { createOrGetChatSession } from "@/app/_actions/chatActions"; // Adjust path
import ChatWindow from "./ChatWindow"; // Import placeholder

interface InteractiveCheckinListProps {
  otherCheckins: SelectCheckin[];
  placeId: string;
  currentUserCheckinId: number | null; // Viewing user's check-in ID at this place
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

  const handleInitiateChat = async (receiverCheckin: SelectCheckin) => {
    if (!currentUserCheckinId) {
      setErrorMessage("You need to be checked in to start a chat.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    if (isLoadingChat) return;

    setIsLoadingChat(true);
    setErrorMessage(null);
    setActiveChatSessionId(null);
    setChatPartnerCheckinId(null);

    const result = await createOrGetChatSession(
      currentUserCheckinId,
      receiverCheckin.id,
      placeId
    );

    if (result.error || !result.sessionId) {
      console.error("Failed to create/get chat session:", result.error);
      setErrorMessage(result.error || "Could not start chat.");
      setTimeout(() => setErrorMessage(null), 3000);
    } else {
      setActiveChatSessionId(result.sessionId);
      setChatPartnerCheckinId(receiverCheckin.id);
      setErrorMessage(null); // Clear error on success
    }
    setIsLoadingChat(false);
  };

  // If a chat is active, show the ChatWindow
  if (activeChatSessionId && chatPartnerCheckinId && currentUserCheckinId) {
    return (
      <ChatWindow
        sessionId={activeChatSessionId}
        currentUserCheckinId={currentUserCheckinId}
        partnerCheckinId={chatPartnerCheckinId}
        onClose={() => {
          // Function to close the chat window
          setActiveChatSessionId(null);
          setChatPartnerCheckinId(null);
        }}
      />
    );
  }

  // Otherwise, show the list
  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-3">Checked In Nearby</h2>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {errorMessage}
        </div>
      )}

      {otherCheckins.length === 0 && !errorMessage && (
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-600 italic">
            No one else is checked in right now.
          </p>
        </div>
      )}

      {otherCheckins.length > 0 && (
        <ul className="space-y-3">
          {otherCheckins.map((checkin) => (
            <li
              key={checkin.id}
              className={`p-3 rounded-md border bg-white flex justify-between items-center transition-opacity ${
                isLoadingChat ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    checkin.status === "available"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {checkin.status === "available" ? "Available" : "Busy"}
                </span>
                {checkin.topic ? (
                  <span className="text-gray-800 italic">
                    "{checkin.topic}"
                  </span>
                ) : (
                  <span className="text-gray-500">Open to general chat</span>
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
    </section>
  );
}
