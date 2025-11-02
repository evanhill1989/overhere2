// src/components/SimpleMessagingWindow.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send } from "lucide-react";
import { useRealtimeMessages } from "@/hooks/realtime-hooks/useRealtimeMessages";
import { createClient } from "@/utils/supabase/client";

interface SimpleMessagingWindowProps {
  sessionId: string;
  currentUserCheckinId: string;
  placeName: string;
  onClose: () => void;
}

export function SimpleMessagingWindow({
  sessionId,
  currentUserCheckinId,
  placeName,
  onClose,
}: SimpleMessagingWindowProps) {
  const { messages, isLoading } = useRealtimeMessages(sessionId);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);

      const { error: sendError } = await supabase.from("messages").insert({
        session_id: sessionId,
        sender_checkin_id: currentUserCheckinId,
        content: newMessage.trim(),
      });

      if (sendError) throw sendError;

      setNewMessage("");
    } catch (err) {
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed right-4 bottom-4 flex h-96 w-80 flex-col rounded-lg border bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-medium">{placeName}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && (
          <div className="text-center text-sm text-gray-500">
            Loading messages...
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center text-sm text-gray-500">
            No messages yet. Start the conversation! 👋
          </div>
        )}

        {messages.map((message) => {
          const isOwn = message.senderCheckinId === currentUserCheckinId;
          return (
            <div
              key={message.id}
              className={`max-w-[80%] rounded p-2 text-sm ${
                isOwn
                  ? "ml-auto bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {message.content}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="min-h-0 flex-1 resize-none"
            rows={1}
            disabled={isSending}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
