// src/components/MessageInput.tsx (UPDATE)
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { submitMessage } from "@/app/_actions/messageActions";
import { useFormStatus } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Message } from "../app/places/[placeId]/_components/EphemeralSessonWindow";

export type MessageInputProps = {
  sessionId: string;
  senderCheckinId?: number;
};

export function MessageInput({
  sessionId,
  senderCheckinId,
}: MessageInputProps) {
  const queryClient = useQueryClient();
  const { pending: isPending } = useFormStatus();

  const initial = {
    ok: false,
    newMessage: null,
    error: "",
  };

  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      // Optimistic update - add message immediately
      console.log(state);
      const content = formData.get("content") as string;
      const tempMessage: Message = {
        id: Date.now(), // Temporary ID
        content: content.trim(),
        senderCheckinId: senderCheckinId!,
        createdAt: new Date().toISOString(),
      };

      // Add to React Query cache optimistically
      queryClient.setQueryData(
        ["messages", sessionId],
        (oldMessages: Message[] = []) => [...oldMessages, tempMessage],
      );

      try {
        const result = await submitMessage(prevState, formData);

        if (result.ok) {
          // Success - real-time will add the real message, remove temp one
          queryClient.setQueryData(
            ["messages", sessionId],
            (oldMessages: Message[] = []) =>
              oldMessages.filter((msg) => msg.id !== tempMessage.id),
          );
        } else {
          // Error - remove optimistic message
          queryClient.setQueryData(
            ["messages", sessionId],
            (oldMessages: Message[] = []) =>
              oldMessages.filter((msg) => msg.id !== tempMessage.id),
          );
        }

        return result;
      } catch (error) {
        // Error - remove optimistic message
        queryClient.setQueryData(
          ["messages", sessionId],
          (oldMessages: Message[] = []) =>
            oldMessages.filter((msg) => msg.id !== tempMessage.id),
        );
        throw error;
      }
    },
    initial,
  );

  return (
    <form action={formAction} className="flex gap-2">
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
    </form>
  );
}
