// src/hooks/useMessageRequest.ts

"use client";

import { useTransition } from "react";
import { requestMessage } from "@/app/_actions/messageActions";

export function useMessageRequest() {
  const [isPending, startTransition] = useTransition();

  const submitRequest = (
    senderId: string,
    recipientId: string,
    placeId: string,
    onDone?: () => void,
  ) => {
    startTransition(async () => {
      const result = await requestMessage({ senderId, recipientId, placeId });
      onDone?.();
      if (!result.success) {
        console.error("Message request failed:", result.error);
      }
    });
  };

  return { submitRequest, isPending };
}
