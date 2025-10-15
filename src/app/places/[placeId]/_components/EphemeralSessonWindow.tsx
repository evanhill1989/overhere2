// src/app/places/[placeId]/_components/EphemeralSessonWindow.tsx
"use client";

import { useRef, useEffect, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { X, Minimize2, AlertCircle } from "lucide-react";

import type { MessageInputProps } from "@/components/MessageInput";
import type { UserId, PlaceId, SessionId } from "@/lib/types/database";
import { useRealtimeMessages } from "@/hooks/realtime-hooks/useRealtimeMessages";

type WindowState = "opening" | "active" | "minimized" | "closing";

type EphemeralSessionWindowProps = {
  session: {
    id: SessionId;
    placeId: PlaceId;
    initiatorId: UserId;
    initiateeId: UserId;
  };
  currentUserId: UserId;
  checkinId?: string;
  children?: ReactElement<MessageInputProps>;
  onBack?: () => void;
  onMinimize?: () => void;
  place: { name: string; address: string };
  windowState?: WindowState;
  error?: string | null;
};

export type Message = {
  id: number;
  content: string;
  senderCheckinId: string;
  createdAt: string;
};

export function EphemeralSessionWindow({
  session,
  checkinId,
  children,
  onBack,
  onMinimize,
  place,
  windowState = "active",
  error,
}: EphemeralSessionWindowProps) {
  const messages = useRealtimeMessages(session.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (windowState === "active") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, windowState]);

  // Focus management for accessibility
  useEffect(() => {
    if (windowState === "active" && windowRef.current) {
      windowRef.current.focus();
    }
  }, [windowState]);

  const windowClasses = `
    messaging-window
    flex h-[80vh] flex-col gap-4 border rounded-lg p-4 shadow-lg
    bg-background transition-all duration-200
    ${windowState === "opening" ? "animate-slide-up opacity-0" : ""}
    ${windowState === "active" ? "opacity-100" : ""}
    ${windowState === "closing" ? "animate-slide-down opacity-0" : ""}
  `;

  return (
    <section
      ref={windowRef}
      className={windowClasses}
      role="dialog"
      aria-label={`Messaging session at ${place.name}`}
      tabIndex={-1}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close messaging</span>
            </Button>
          )}
          <div className="text-center">
            <h2 className="text-base font-semibold">{place.name}</h2>
            <p className="text-muted-foreground text-xs">{place.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Connection status indicator */}
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            Connected
          </div>

          {onMinimize && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinimize}
              className="text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="sr-only">Minimize messaging</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-destructive/10 border-destructive/20 flex items-center gap-2 rounded border p-3">
          <AlertCircle className="text-destructive h-4 w-4" />
          <span className="text-destructive text-sm">{error}</span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 space-y-3 overflow-y-auto scroll-smooth pr-2">
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm italic">
              Start the conversation! 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderCheckinId === checkinId;
            return (
              <div
                key={msg.id}
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  isOwnMessage
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted mr-auto"
                }`}
              >
                <div className="break-words">{msg.content}</div>
                <div
                  className={`mt-1 text-xs ${
                    isOwnMessage
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input area */}
      <div className="border-t pt-2">{children}</div>
    </section>
  );
}
