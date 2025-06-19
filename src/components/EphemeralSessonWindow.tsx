"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type EphemeralSessionWindowProps = {
  session: {
    id: string;
    placeId: string;
    initiatorId: string;
    initiateeId: string;
  };
  currentUserId: string;
  checkinId?: number;
};

type Message = {
  id: number;
  content: string;
  senderCheckinId: number;
  createdAt: string;
};

export function EphemeralSessionWindow({
  session,
  currentUserId,
  checkinId,
}: EphemeralSessionWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?sessionId=${session.id}`);
      const data = await res.json();
      setMessages(data);
      setLoading(false);
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 8000); // Polling
    return () => clearInterval(interval);
  }, [session.id]);

  const handleSend = async () => {
    if (!messageText.trim()) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.id,
        senderCheckinId: checkinId,
        content: messageText.trim(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      setMessageText("");
      const updated = await res.json();
      setMessages(updated);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="bg-background flex h-[70vh] max-h-[500px] flex-col rounded-md border p-4">
      <h2 className="mb-2 text-lg font-semibold">You're connected</h2>

      <div className="bg-muted mb-3 flex-1 space-y-2 overflow-y-auto rounded-md border p-2">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-xs rounded-lg p-2 text-sm ${
                msg.senderCheckinId === checkinId
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted mr-auto"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type something friendly..."
          rows={2}
        />
        <Button onClick={handleSend} disabled={!messageText.trim()}>
          Send
        </Button>
      </div>
    </section>
  );
}
