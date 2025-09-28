// src/hooks/useMessageRequestMutation.ts (NEW)
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestToMessage } from "@/app/_actions/messageActions";

type MessageRequestInput = {
  initiatorId: string;
  initiateeId: string;
  placeId: string;
};

export function useMessageRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MessageRequestInput) => {
      const result = await requestToMessage(input);
      if (!result.success) {
        throw new Error(result.error || "Failed to send request");
      }
      return result;
    },
    onMutate: async (newRequest) => {
      // ✅ OPTIMISTIC UPDATE: Show "Requested" immediately
      await queryClient.cancelQueries({
        queryKey: ["messageRequests", newRequest.initiatorId],
      });

      const previousRequests = queryClient.getQueryData([
        "messageRequests",
        newRequest.initiatorId,
      ]);

      // Add optimistic request to cache
      queryClient.setQueryData(
        ["messageRequests", newRequest.initiatorId],
        (old: unknown[] = []) => [
          ...old,
          {
            id: `temp-${Date.now()}`,
            ...newRequest,
            status: "pending",
            createdAt: new Date().toISOString(),
            topic: null,
          },
        ],
      );

      return { previousRequests };
    },
    onError: (err, newRequest, context) => {
      // ✅ ROLLBACK: Restore previous state on error
      if (context?.previousRequests) {
        queryClient.setQueryData(
          ["messageRequests", newRequest.initiatorId],
          context.previousRequests,
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log("✅ Message request sent successfully");

      // ✅ Update both sender and receiver caches
      queryClient.invalidateQueries({
        queryKey: ["messageRequests", variables.initiatorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["messageRequests", variables.initiateeId],
      });
    },
    onSettled: (data, error, variables) => {
      // ✅ REFRESH: Always refetch to get true server state
      queryClient.invalidateQueries({
        queryKey: ["messageRequests", variables.initiatorId],
      });
    },
  });
}
