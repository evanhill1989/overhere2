"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { submitMessage } from "@/app/_actions/messageActions";
import { useFormStatus } from "react-dom";
import { Message } from "./EphemeralSessonWindow";

export type MessageInputProps = {
  sessionId: string;
  senderCheckinId?: number;
  onSent?: (msg: Message) => void;
};

export function MessageInput({
  sessionId,
  senderCheckinId,
  onSent,
}: MessageInputProps) {
  const initial = {
    ok: false,
    newMessage: null,
    error: "",
  };

  const [state, formAction] = useActionState(submitMessage, initial);
  const { pending: isPending } = useFormStatus();

  // side-effect when a new message comes back
  if (state.ok && state.newMessage && onSent) {
    const { createdAt, ...rest } = state.newMessage;
    onSent({ ...rest, createdAt: createdAt.toISOString() });
  }

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="senderCheckinId" value={senderCheckinId} />

      <Textarea
        name="content"
        placeholder="Say something friendly…"
        className="flex-1"
        rows={2}
        disabled={isPending}
        required
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
      </Button>
    </form>
  );
}
