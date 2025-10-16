// src/hooks/useMessageRequestResponse.ts
"use client";

import { useTransition } from "react";
import { respondToMessageRequest } from "@/app/_actions/messageActions";
import type { RequestId, MessageRequestStatus } from "@/lib/types/database";

import {
  MESSAGE_REQUEST_STATUS,
  messageRequestStatusSchema,
} from "@/lib/types/database";

// ============================================
// TYPES
// ============================================

// type RespondToRequestInput = {
//   requestId: RequestId;
//   response: Extract<MessageRequestStatus, "accepted" | "rejected">;
// };

type RespondToRequestOptions = {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
};

// ============================================
// HOOK
// ============================================

export function useMessageRequestResponse(options?: RespondToRequestOptions) {
  const [isPending, startTransition] = useTransition();

  const respondToRequest = (
    requestId: RequestId,
    response: Extract<MessageRequestStatus, "accepted" | "rejected">,
  ) => {
    startTransition(async () => {
      try {
        // Validate the response type at runtime
        const validatedResponse = messageRequestStatusSchema.parse(response);

        if (
          validatedResponse !== MESSAGE_REQUEST_STATUS.ACCEPTED &&
          validatedResponse !== MESSAGE_REQUEST_STATUS.REJECTED
        ) {
          throw new Error("Invalid response type");
        }

        // Create FormData to match server action signature
        const formData = new FormData();
        formData.append("requestId", requestId);
        formData.append("response", validatedResponse);

        console.log("📤 Responding to message request:", {
          requestId,
          response: validatedResponse,
        });

        const result = await respondToMessageRequest({ message: "" }, formData);

        // Check if the response indicates success
        const isSuccess =
          result.message === "Request accepted." ||
          result.message === "Request rejected.";

        if (isSuccess) {
          console.log("✅ Request response successful:", result.message);
          options?.onSuccess?.(result.message);
        } else {
          console.error("❌ Request response failed:", result.message);
          options?.onError?.(result.message);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("❌ respondToRequest failed:", errorMessage);
        options?.onError?.(errorMessage);
      }
    });
  };

  const acceptRequest = (requestId: RequestId) => {
    respondToRequest(requestId, MESSAGE_REQUEST_STATUS.ACCEPTED);
  };

  const rejectRequest = (requestId: RequestId) => {
    respondToRequest(requestId, MESSAGE_REQUEST_STATUS.REJECTED);
  };

  return {
    acceptRequest,
    rejectRequest,
    respondToRequest,
    isPending,
  };
}
