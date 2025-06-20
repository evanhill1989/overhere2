// components/MessageInput.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { submitMessage } from "@/app/_actions/messageActions";

type Props = {
  sessionId: string;
  senderCheckinId?: number;
  onSent?: (msg: { id: number; content: string }) => void;
};

export function MessageInput({ sessionId, senderCheckinId, onSent }: Props) {
  const initial = {
    ok: false,
    newMessage: null as null | { id: number; content: string },
    error: "",
  };
  const [state, formAction] = useFormState(submitMessage, initial);
  const { pending } = useFormStatus();

  // side-effect when a new message comes back
  if (state.ok && state.newMessage && onSent) onSent(state.newMessage);

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="senderCheckinId" value={senderCheckinId} />

      <Textarea
        name="content"
        placeholder="Say something friendly…"
        className="flex-1"
        rows={2}
        disabled={pending}
        required
      />

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
      </Button>
    </form>
  );
}
