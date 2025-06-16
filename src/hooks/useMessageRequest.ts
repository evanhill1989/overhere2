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
    checkinId: number,
    onDone?: () => void,
  ) => {
    startTransition(async () => {
      const result = await requestToMessage({
        initiatorId,
        initiateeId,
        placeId,
        checkinId,
      });
      onDone?.();
      if (!result.success) {
        console.error("Message request failed:", result.error);
      }
    });
  };

  return { submitRequest, isPending };
}
