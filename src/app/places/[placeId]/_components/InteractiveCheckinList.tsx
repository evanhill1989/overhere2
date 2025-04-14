// app/places/[placeId]/_components/InteractiveCheckinList.tsx
"use client";

import { useState } from "react";
import type { SelectCheckin } from "@/db/schema"; // Import the checkin type

// Define props including the list of other check-ins
interface InteractiveCheckinListProps {
  otherCheckins: SelectCheckin[];
  placeId: string; // Keep placeId if needed for context or future actions
}

export default function InteractiveCheckinList({
  otherCheckins,
  placeId,
}: InteractiveCheckinListProps) {
  const [interactionMessage, setInteractionMessage] = useState<string | null>(
    null
  );
  const [interactingWithId, setInteractingWithId] = useState<number | null>(
    null
  );

  const handleInitiateChat = (checkin: SelectCheckin) => {
    // In V1, just provide feedback. V2 could involve actual chat/notifications.
    setInteractingWithId(checkin.id);
    const topicMsg = checkin.topic ? ` about "${checkin.topic}"` : "";
    setInteractionMessage(
      `You've signaled interest in chatting${topicMsg}. Look around for someone who might be waiting!`
    );

    setTimeout(() => {
      setInteractionMessage(null);
      setInteractingWithId(null);
    }, 5000);
  };

  if (otherCheckins.length === 0) {
    return (
      <section className="mt-6 bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-600 italic">
          No one else is checked in right now.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-3">Checked In Nearby</h2>
      {interactionMessage && interactingWithId && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-sm">
          {interactionMessage}
        </div>
      )}
      <ul className="space-y-3">
        {otherCheckins.map((checkin) => (
          <li
            key={checkin.id}
            className={`p-3 rounded-md border flex justify-between items-center ${
              interactingWithId === checkin.id
                ? "bg-yellow-50 border-yellow-300"
                : "bg-white"
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
                <span className="text-gray-800 italic">"{checkin.topic}"</span>
              ) : (
                <span className="text-gray-500">Open to general chat</span>
              )}
            </div>
            {checkin.status === "available" &&
              interactingWithId !== checkin.id && (
                <button
                  onClick={() => handleInitiateChat(checkin)}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  Say Hi
                </button>
              )}
            {interactingWithId === checkin.id && (
              <span className="text-sm text-yellow-700 font-medium">
                Signaled!
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
