// components/EphemeralSessionWindow.tsx

"use client";

import {
  useRef,
  useState,
  useEffect,
  isValidElement,
  cloneElement,
  ReactElement,
} from "react";
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
  onBack?: () => void; // ✅ new
  place: { name: string; address: string }; // ✅ NEW
};
export function EphemeralSessionWindow({
  session,
  checkinId,
  children,
  onBack,
  place,
}: EphemeralSessionWindowProps) {
  // Realtime stream from Supabase
  const realtimeMessages = useRealtimeMessages(session.id);

  // Local (optimistic) copy so we can render a sent message instantly
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync realtime data into local state whenever it changes
  useEffect(() => {
    console.log(realtimeMessages, "realtimeMessages in ESW");
    setMessages(realtimeMessages);
    setLoading(false);
  }, [realtimeMessages]);

  // Auto‑scroll to bottom on new messages
  useEffect(() => {
    console.log(messages, "messages in useEffect that scrolls messages in ESW");
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      {/* Inject onSent so child can optimistically append */}
      {children &&
        isValidElement(children) &&
        cloneElement(children, {
          onSent: (msg: Message) => setMessages((prev) => [...prev, msg]),
        })}
    </section>
  );
}
