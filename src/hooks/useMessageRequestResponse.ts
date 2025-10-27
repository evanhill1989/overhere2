"use client";

import { useTransition } from "react";
// 💡 Import useQueryClient from TanStack Query
import { useQueryClient } from "@tanstack/react-query";
import { respondToMessageRequest } from "@/app/_actions/messageActions";
import type {
  RequestId,
  MessageRequestStatus,
  MessageSession, // The client-side (camelCase) session type
  DatabaseMessageSession, // The raw server (snake_case) session type
  ValidatedTimestamp,
} from "@/lib/types/database"; // Assuming your canonical types are here

import {
  MESSAGE_REQUEST_STATUS,
  messageRequestStatusSchema,
} from "@/lib/types/database";

// 💡 ASSUMPTION: You have a utility function to convert snake_case to camelCase
// You will need to ensure this import path and function signature are correct.
// The session returned from the server (newSession) is snake_case (DatabaseMessageSession).
// The cache stores camelCase (MessageSession).
function mapSessionToCamel(dbSession: DatabaseMessageSession): MessageSession {
  const toBrandedDate = (
    isoString: string | null,
  ): ValidatedTimestamp | null => {
    if (!isoString) return null;
    // Convert to Date, then assert the branded type
    return new Date(isoString) as ValidatedTimestamp;
  };
  const toBrandedRequestId = (
    id: string | null,
  ): MessageSession["sourceRequestId"] => {
    if (!id) return null;
    // Assert the branded type
    return id as MessageSession["sourceRequestId"];
  };

  return {
    // Assertions for Branded ID types
    id: dbSession.id as MessageSession["id"],
    placeId: dbSession.place_id as MessageSession["placeId"],
    initiatorId: dbSession.initiator_id as MessageSession["initiatorId"],
    initiateeId: dbSession.initiatee_id as MessageSession["initiateeId"],

    sourceRequestId: toBrandedRequestId(dbSession.source_request_id),

    // Date conversions (Fixes the TS error)
    createdAt: new Date(dbSession.created_at) as ValidatedTimestamp,
    expiresAt: toBrandedDate(dbSession.expires_at),
    closedAt: toBrandedDate(dbSession.closed_at),

    // Simple property
    status: dbSession.status as MessageSession["status"],
  };
}

type RespondToRequestOptions = {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
};

export function useMessageRequestResponse(options?: RespondToRequestOptions) {
  const [isPending, startTransition] = useTransition();
  // 💡 Initialize Query Client
  const queryClient = useQueryClient();

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
        } // Create FormData to match server action signature

        const formData = new FormData();
        formData.append("requestId", requestId);
        formData.append("response", validatedResponse);

        console.log("📤 Responding to message request:", {
          requestId,
          response: validatedResponse,
        }); // The result now includes the optional newSession field

        const result = await respondToMessageRequest({ message: "" }, formData); // Check if the response indicates success

        const isSuccess =
          result.message === "Request accepted." ||
          result.message === "Request rejected.";

        if (isSuccess) {
          // 💡 NEW CACHE UPDATE LOGIC
          if (
            validatedResponse === MESSAGE_REQUEST_STATUS.ACCEPTED &&
            result.newSession
          ) {
            // 1. Convert the raw database object (snake_case) to client type (camelCase)
            const newSession = mapSessionToCamel(result.newSession);

            // 2. Define the exact query key that useRealtimeMessageSession listens to.
            // Note: The acceptor (user who accepted) is the initiateeId.
            const acceptorUserId = newSession.initiateeId;
            const placeId = newSession.placeId;

            const sessionQueryKey = [
              "messageSession",
              acceptorUserId,
              placeId,
            ] as const;

            // 3. Set the data directly into the cache. This instantly updates the UI
            // of the component consuming useRealtimeMessageSession.
            queryClient.setQueryData<MessageSession | null>(
              sessionQueryKey,
              newSession,
            );

            console.log(
              "✅ Cache updated: New active session established:",
              newSession.id,
            );
          }

          // 4. Invalidate all message request lists to ensure the UI removes the responded-to request.
          queryClient.invalidateQueries({ queryKey: ["messageRequests"] });

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
