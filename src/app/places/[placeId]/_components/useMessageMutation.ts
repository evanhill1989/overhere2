// src/hooks/useMessageMutation.ts (ENHANCED VERSION)
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitMessage } from "@/app/_actions/messageActions";
import type { SessionId, CheckinId } from "@/lib/types/database";
import { SendMessageResponse } from "@/lib/types/api";

// ============================================
// TYPES
// =======================
type SendMessageSuccessData = Extract<
  SendMessageResponse,
  { success: true }
>["data"];

type SendMessageInput = {
  sessionId: SessionId;
  senderCheckinId: CheckinId;
  content: string;
};

type UseMessageMutationOptions = {
  onSuccess?: (data: SendMessageSuccessData) => void;
  onError?: (error: Error) => void;
};

// ============================================
// MUTATION HOOK
// ============================================

export function useMessageMutation(options?: UseMessageMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    // ✅ Mutation function with proper error handling
    mutationFn: async ({
      sessionId,
      senderCheckinId,
      content,
    }: SendMessageInput) => {
      // Client-side validation
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new Error("Message cannot be empty");
      }
      if (trimmedContent.length > 1000) {
        throw new Error("Message too long (max 1000 characters)");
      }

      // Create FormData to match server action signature
      const formData = new FormData();
      formData.append("content", trimmedContent);
      formData.append("sessionId", sessionId);
      formData.append("senderCheckinId", senderCheckinId);

      console.log("📤 Sending message via server action:", {
        sessionId,
        senderCheckinId,
        contentLength: trimmedContent.length,
      });

      const result = await submitMessage(
        { success: false, error: "Not submitted yet" },
        formData,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to send message");
      }

      return result.data!;
    },

    // ✅ SUPER PRAGMATIC - Just use what we need
    onMutate: async ({ sessionId, senderCheckinId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", sessionId] });

      const previousMessages = queryClient.getQueryData([
        "messages",
        sessionId,
      ]);

      // ✅ Just a plain object with what we need for UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: content.trim(),
        senderCheckinId,
        createdAt: new Date().toISOString(),
        readAt: null,
        _isOptimistic: true, // Easy to filter out later
      };

      queryClient.setQueryData(
        ["messages", sessionId],
        (old: unknown[] = []) => [...(old as object[]), optimisticMessage],
      );

      return { previousMessages, optimisticMessage };
    },

    onSettled: (data, error, variables, context) => {
      // Remove optimistic messages
      if (context?.optimisticMessage) {
        queryClient.setQueryData(
          ["messages", variables.sessionId],
          (messages: unknown[] = []) =>
            (messages as object[]).filter(
              (msg: object) => !("_isOptimistic" in msg),
            ),
        );
      }

      // Invalidate for real data
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.sessionId],
      });
    },

    // ✅ Automatic rollback on error
    onError: (error, variables, context) => {
      console.error("❌ Message send failed:", error.message);

      // Rollback to previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", variables.sessionId],
          context.previousMessages,
        );
      }

      // Call custom error handler
      options?.onError?.(error as Error);
    },

    // ✅ Success handling
    onSuccess: (data, variables) => {
      console.log("✅ Message sent successfully:", data.message.id, variables);

      // Call custom success handler
      options?.onSuccess?.(data);
    },

    // ✅ Enhanced retry logic
    retry: (failureCount, error) => {
      console.log(`🔄 Retry attempt ${failureCount} for message send`);

      // Don't retry validation errors
      if (error.message.includes("empty") || error.message.includes("long")) {
        return false;
      }

      // Don't retry authentication errors
      if (
        error.message.includes("auth") ||
        error.message.includes("permission")
      ) {
        return false;
      }

      // Retry network/server errors up to 2 times
      return failureCount < 2;
    },

    // ✅ Exponential backoff for retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
