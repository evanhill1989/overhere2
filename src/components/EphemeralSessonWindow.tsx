// src/components/EphemeralSessonWindow.tsx (UPDATE)
"use client";

import { useRef, useEffect, ReactElement } from "react";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import type { MessageInputProps } from "@/components/MessageInput";

export type Message = {
  id: number;
  content: string;
  senderCheckinId: number;
  createdAt: string;
};

type EphemeralSessionWindowProps = {
  session: {
    id: string;
    placeId: string;
    initiatorId: string;
    initiateeId: string;
  };
  currentUserId: string;
  checkinId?: number;
  children?: ReactElement<MessageInputProps>;
  onBack?: () => void;
  place: { name: string; address: string };
};

export function EphemeralSessionWindow({
  session,
  checkinId,
  children,
  onBack,
  place,
}: EphemeralSessionWindowProps) {
  // ✅ UPDATED: Use the React Query + real-time hook
  const messages = useRealtimeMessages(session.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto‑scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ REMOVED: Local optimistic state - React Query handles this now
  return (
    <section className="flex h-[80vh] flex-col gap-4 border p-4 shadow">
      {onBack && (
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="text-muted-foreground text-sm underline"
          >
            👈 Back to list
          </button>
        </div>
      )}
      <div className="text-center">
        <h2 className="text-base font-semibold">{place.name}</h2>
        <p className="text-muted-foreground text-sm">{place.address}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            No messages yet.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[70%] px-3 py-2 text-sm ${
                msg.senderCheckinId === checkinId
                  ? "bg-primary/10 text-primary-foreground ml-auto"
                  : ""
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ✅ REMOVED: onSent prop - React Query handles optimistic updates */}
      {children}
    </section>
  );
}
