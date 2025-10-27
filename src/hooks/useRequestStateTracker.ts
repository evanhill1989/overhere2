// src/hooks/useRequestStateTracker.ts
"use client";

import { useRef, useState } from "react";
import type { UserId, PlaceId, RequestId } from "@/lib/types/database";

type RequestState = {
  requestId: RequestId;
  initiatorId: UserId;
  initiateeId: UserId;
  placeId: PlaceId;
  status: "pending" | "accepted" | "rejected" | "canceled";
  sentAt: Date;
  receivedAt?: Date;
  acknowledged: boolean;
};

const FAILURE_THRESHOLD_MS = 5000;

export function useRequestStateTracker() {
  const [pendingDeliveries] = useState(
    () => new Map<RequestId, RequestState>(),
  );
  const timeoutsRef = useRef(new Map<RequestId, NodeJS.Timeout>());

  // Track a new request that was sent
  const trackRequest = (request: Omit<RequestState, "acknowledged">) => {
    const fullRequest: RequestState = {
      ...request,
      acknowledged: false,
    };

    console.log("📊📊  📊📊 Tracking request:", request.requestId);
    pendingDeliveries.set(request.requestId, fullRequest);

    // Set up timeout for this specific request
    const timeout = setTimeout(() => {
      const tracked = pendingDeliveries.get(request.requestId);
      console.log(
        "🔍🔍  🔍🔍 TIMEOUT FIRED for:",
        request.requestId,
        "tracked:",
        !!tracked,
        "acknowledged:",
        tracked?.acknowledged,
      );
      if (tracked && !tracked.acknowledged) {
        console.warn(
          "⚠️⚠️ 🛑⚠️⚠️🛑 ⚠️⚠️ Request not acknowledged after 5s:",
          request.requestId,
        );
      }
    }, FAILURE_THRESHOLD_MS);

    timeoutsRef.current.set(request.requestId, timeout);
  };

  // Mark a request as acknowledged by the recipient
  const acknowledgeRequest = (requestId: RequestId) => {
    const tracked = pendingDeliveries.get(requestId);
    if (tracked) {
      tracked.acknowledged = true;
      tracked.receivedAt = new Date();
      console.log("✅✅  ✅✅ Request acknowledged:", requestId);

      // Clear the timeout since it's been acknowledged
      const timeout = timeoutsRef.current.get(requestId);
      if (timeout) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(requestId);
      }
    } else {
      console.warn("🤔 Acknowledging unknown request:", requestId);
    }
  };

  // Check for requests that have failed to be delivered
  const checkForFailures = (): RequestState[] => {
    const now = new Date();
    const failures: RequestState[] = [];

    for (const [requestId, state] of pendingDeliveries.entries()) {
      const timeSinceSent = now.getTime() - state.sentAt.getTime();

      if (!state.acknowledged && timeSinceSent > FAILURE_THRESHOLD_MS) {
        failures.push(state);
      }
    }

    return failures;
  };

  // Get delivery statistics
  const getStats = () => {
    const total = pendingDeliveries.size;
    const acknowledged = Array.from(pendingDeliveries.values()).filter(
      (r) => r.acknowledged,
    ).length;
    const failures = checkForFailures();

    return {
      totalSent: total,
      totalReceived: acknowledged,
      totalFailed: failures.length,
      failureRate: total > 0 ? failures.length / total : 0,
    };
  };

  // Clean up old entries manually
  const cleanup = () => {
    const now = new Date();
    const cutoff = 60000; // 1 minute

    for (const [requestId, state] of pendingDeliveries.entries()) {
      const age = now.getTime() - state.sentAt.getTime();
      if (age > cutoff) {
        pendingDeliveries.delete(requestId);

        // Clean up timeout too
        const timeout = timeoutsRef.current.get(requestId);
        if (timeout) {
          clearTimeout(timeout);
          timeoutsRef.current.delete(requestId);
        }
      }
    }
  };

  // Debug function to see all tracked requests
  const getAllTracked = () => {
    return Array.from(pendingDeliveries.entries()).map(([id, state]) => ({
      id,
      ...state,
      ageMs: Date.now() - state.sentAt.getTime(),
    }));
  };

  return {
    trackRequest,
    acknowledgeRequest,
    checkForFailures,
    getStats,
    cleanup,
    getAllTracked, // For debugging
  };
}
