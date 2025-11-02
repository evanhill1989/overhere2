// src/hooks/useMessageRequestMutation.ts (NEW)
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestToMessage } from "@/app/_actions/messageActions";
import { MessageRequestsQueryKey, PlaceId, UserId } from "@/lib/types/database";
import { useRequestStateTracker } from "./useRequestStateTracker";

type MessageRequestInput = {
  initiatorId: UserId;
  initiateeId: UserId;
  placeId: PlaceId;
};

export function useMessageRequestMutation() {
  const queryClient = useQueryClient();
  const tracker = useRequestStateTracker();

  return useMutation({
    mutationFn: async (input: MessageRequestInput) => {
      const result = await requestToMessage(input);
      if (!result.success) {
        throw new Error(result.error || "Failed to send request");
      }
      return result;
    },
    onMutate: async (newRequest) => {
      // Define the two keys that must be updated
      const initiatorKey: MessageRequestsQueryKey = [
        "messageRequests",
        newRequest.initiatorId,
        newRequest.placeId, // 🛑 MUST INCLUDE placeId
      ];
      const initiateeKey: MessageRequestsQueryKey = [
        "messageRequests",
        newRequest.initiateeId,
        newRequest.placeId, // 🛑 MUST INCLUDE placeId
      ];
      // 1. OPTIMISTIC UPDATE: Show "Requested" immediately for the INITIATOR
      await queryClient.cancelQueries({ queryKey: initiatorKey });

      const previousRequests = queryClient.getQueryData(initiatorKey);

      // Add optimistic request to initiator's cache (3-part key)
      queryClient.setQueryData(initiatorKey, (old: any[] = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          ...newRequest,
          status: "pending",
          createdAt: new Date().toISOString(),
          topic: null,
        },
      ]); // Note: We do *not* optimistically update the initiatee's view, as they
      // should rely on the *realtime* event (or refetch) to see the request.

      return { previousRequests, initiatorKey, initiateeKey };
    },
    onError: (err, newRequest, context) => {
      // 2. ROLLBACK: Restore previous state on error
      if (context?.previousRequests && context.initiatorKey) {
        queryClient.setQueryData(
          context.initiatorKey as MessageRequestsQueryKey,
          context.previousRequests,
        );
      }
    },
    onSuccess: (data, variables, context) => {
      if (data.success && data.data?.requestId) {
        tracker.trackRequest({
          requestId: data.data.requestId,
          initiatorId: variables.initiatorId,
          initiateeId: variables.initiateeId,
          placeId: variables.placeId,
          status: "pending",
          sentAt: new Date(),
        });
      }

      if (context?.initiatorKey && context.initiateeKey) {
        // 3. REFETCH/INVALIDATE the keys for BOTH users to get the true server state
        // Initiator (A) refreshes to replace the optimistic data with real data
        queryClient.refetchQueries({ queryKey: context.initiatorKey }); // Initiatee (B) refreshes/invalidates (usually relies on Realtime, but this is a backup)
        queryClient.invalidateQueries({ queryKey: context.initiateeKey });
      }
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: [
            "messageRequests",
            variables.initiateeId,
            variables.placeId,
          ],
        });
      }, 2000);
    },
    onSettled: (data, error, variables, context) => {
      // 4. Final safety net invalidation for both.
      if (context?.initiatorKey && context.initiateeKey) {
        queryClient.invalidateQueries({ queryKey: context.initiatorKey });
        queryClient.invalidateQueries({ queryKey: context.initiateeKey });
      }
    },
  });
}
