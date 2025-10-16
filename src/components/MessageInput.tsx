// src/components/MessageInput.tsx (REFACTORED WITH useMessageMutation)
"use client";

import { useRef, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Use canonical types from type system
import type { SessionId, CheckinId, Message } from "@/lib/types/database";
import { useMessageMutation } from "@/app/places/[placeId]/_components/useMessageMutation";

// ============================================
// COMPONENT TYPES
// ============================================

export interface MessageInputProps {
  sessionId: SessionId;

  senderCheckinId: CheckinId;

  placeholder?: string;

  maxLength?: number;

  onMessageSent?: (message: Message) => void;

  className?: string;

  disabled?: boolean;

  onError?: (error: string) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MessageInput({
  sessionId,
  senderCheckinId,
  placeholder = "Say something friendly…",
  maxLength = 1000,
  onMessageSent,
  className,
  disabled = false,
}: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessageMutation = useMessageMutation({
    onSuccess: (data) => {
      formRef.current?.reset();
      textareaRef.current?.focus();

      onMessageSent?.(data.message);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const formData = new FormData(e.currentTarget);
      const content = formData.get("content") as string;

      const trimmedContent = content?.trim();
      if (!trimmedContent) return;

      if (trimmedContent.length > maxLength) {
        return;
      }

      sendMessageMutation.mutate({
        sessionId,
        senderCheckinId,
        content: trimmedContent,
      });
    },
    [sendMessageMutation, sessionId, senderCheckinId, maxLength],
  );

  // ✅ Auto-resize textarea
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    },
    [],
  );

  // ✅ Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    },
    [handleSubmit],
  );

  const isPending = sendMessageMutation.isPending;
  const error = sendMessageMutation.error;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-2", className)}
      noValidate
    >
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            name="content"
            placeholder={placeholder}
            className={cn(
              "max-h-32 min-h-[44px] resize-none transition-all",
              error && "border-destructive focus-visible:ring-destructive",
              "pr-12", // Space for character count
            )}
            disabled={disabled || isPending}
            maxLength={maxLength}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            aria-describedby={error ? "message-error" : undefined}
            required
          />

          {/* Character count */}
          <div className="text-muted-foreground pointer-events-none absolute right-2 bottom-2 text-xs">
            <span
              className={cn(
                "transition-colors",
                (textareaRef.current?.value?.length ?? 0) > maxLength * 0.9 &&
                  "text-warning",
                (textareaRef.current?.value?.length ?? 0) >= maxLength &&
                  "text-destructive",
              )}
            >
              {textareaRef.current?.value.length || 0}/{maxLength}
            </span>
          </div>
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={disabled || isPending}
          className="shrink-0"
          aria-label="Send message"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* ✅ Typed error display */}
      {error && (
        <div
          id="message-error"
          className="text-destructive flex items-center gap-2 text-sm"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Success feedback */}
      {sendMessageMutation.isSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600">
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
          Message sent
        </div>
      )}
    </form>
  );
}
