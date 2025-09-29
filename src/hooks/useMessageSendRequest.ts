// src/hooks/useMessageSendRequest.ts

"use client";

import { useTransition } from "react";
import { requestToMessage } from "@/app/_actions/messageActions";

export function useMessageSendRequest() {
  const [isPending, startTransition] = useTransition();

  const submitRequest = (
    initiatorId: string,
    initiateeId: string,
    placeId: string,

    onDone?: () => void,
  ) => {
    const input = { initiatorId, initiateeId, placeId };
    startTransition(async () => {
      console.log(
        "📤 IMMEDIATELY before requestToMessage call:",
        JSON.stringify(input),
      );

      const result = await requestToMessage(input);
      onDone?.();
      if (!result.success) {
        console.error("Message request failed:", result.error);
      }
    });
  };

  return { submitRequest, isPending };
}
