"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type EphemeralSessionWindowProps = {
  session: {
    id: string;
    placeId: string;
    initiatorId: string;
    initiateeId: string;
  };
  currentUserId: string;
  checkinId?: number;
  children?: ReactNode;
};

type Message = {
  id: number;
  content: string;
  senderCheckinId: number;
  createdAt: string;
};

export function EphemeralSessionWindow({
  session,

  checkinId,
  children,
}: EphemeralSessionWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?sessionId=${session.id}`);
      const data = await res.json();
      setMessages(data);
      setLoading(false);
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
  }, [session.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="flex h-[80vh] flex-col gap-4 rounded-lg border p-4 shadow">
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            No messages yet.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                msg.senderCheckinId === checkinId
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input passed as child */}
      {children}
    </section>
  );
}
