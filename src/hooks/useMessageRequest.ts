// src/hooks/useMessageRequest.ts

"use client";

import { useTransition } from "react";
import { requestToMessage } from "@/app/_actions/messageActions";

export function useMessageRequest() {
  const [isPending, startTransition] = useTransition();

  const submitRequest = (
    initiatorId: string,
    initiateeId: string,
    placeId: string,
    onDone?: () => void,
  ) => {
    startTransition(async () => {
      const result = await requestToMessage({
        initiatorId,
        initiateeId,
        placeId,
      });
      onDone?.();
      if (!result.success) {
        console.error("Message request failed:", result.error);
      }
    });
  };

  return { submitRequest, isPending };
}
