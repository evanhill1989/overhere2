// src/components/MessageInput.tsx (UPDATE)
"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { submitMessage } from "@/app/_actions/messageActions";
import { useFormStatus } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";

import { SendMessageResponse } from "@/lib/types/api";
import { Message } from "@/app/places/[placeId]/_components/EphemeralSessonWindow";

export type MessageInputProps = {
  sessionId: string;
  senderCheckinId?: string;
};

export function MessageInput({
  sessionId,
  senderCheckinId,
}: MessageInputProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const { pending: isPending } = useFormStatus();
  // ✅ Initial state must match SendMessageResponse type
  const initialState: SendMessageResponse = {
    success: false,
    error: "Not submitted yet",
  };

  const [state, formAction] = useActionState(
    async (
      prevState: SendMessageResponse,
      formData: FormData,
    ): Promise<SendMessageResponse> => {
      const content = formData.get("content") as string;

      if (!content?.trim()) {
        return { success: false, error: "Message cannot be empty" };
      }

      console.log("📤 Sending message:", content.substring(0, 30) + "...");

      const tempMessage: Message = {
        id: Date.now(),
        content: content.trim(),
        senderCheckinId: senderCheckinId!,
        createdAt: new Date().toISOString(),
      };

      // Optimistic update
      queryClient.setQueryData(
        ["messages", sessionId],
        (oldMessages: Message[] = []) => {
          console.log("✨ Adding optimistic message");
          return [...oldMessages, tempMessage];
        },
      );

      try {
        const result = await submitMessage(prevState, formData);

        if (result.success) {
          console.log("✅ Message sent successfully");

          formRef.current?.reset();

          // ✅ WAIT for real-time event to add real message
          // Remove optimistic after a short delay to allow real-time to catch up
          setTimeout(() => {
            queryClient.setQueryData(
              ["messages", sessionId],
              (oldMessages: Message[] = []) => {
                console.log("🧹 Removing optimistic message");
                return oldMessages.filter((msg) => msg.id !== tempMessage.id);
              },
            );
          }, 1000); // ✅ Give real-time 1 second to deliver the real message

          return { success: true, data: result.data };
        } else {
          console.error("❌ Message send failed:", result.error);

          // Remove optimistic message immediately on error
          queryClient.setQueryData(
            ["messages", sessionId],
            (oldMessages: Message[] = []) =>
              oldMessages.filter((msg) => msg.id !== tempMessage.id),
          );

          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error("❌ Message send exception:", error);

        queryClient.setQueryData(
          ["messages", sessionId],
          (oldMessages: Message[] = []) =>
            oldMessages.filter((msg) => msg.id !== tempMessage.id),
        );

        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to send message",
        };
      }
    },
    initialState,
  );

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="senderCheckinId" value={senderCheckinId} />

      <Textarea
        name="content"
        placeholder="Say something friendly…"
        className="flex-1"
        rows={1}
        disabled={isPending}
        required
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
      </Button>

      {!state.success && state.error && state.error !== "Not submitted yet" && (
        <p className="text-destructive text-xs">{state.error}</p>
      )}
    </form>
  );
}
