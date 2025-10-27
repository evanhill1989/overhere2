// src/components/debug/RealtimeStatusIndicator.tsx
"use client";

import { useState } from "react";
import { useRequestDeliveryDebugger } from "@/hooks/useRequestStateTracker";
import type { UserId, PlaceId } from "@/lib/types/database";

type RealtimeStatusIndicatorProps = {
  userId: UserId | null;
  placeId: PlaceId | null;
  enabled?: boolean;
};

export function RealtimeStatusIndicator({
  userId,
  placeId,
  enabled = false,
}: RealtimeStatusIndicatorProps) {
  const { debugInfo } = useRequestDeliveryDebugger(userId, placeId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!enabled || !userId || !placeId) return null;

  const getStatusColor = () => {
    if (!debugInfo) return "bg-gray-500";

    const { failureRate } = debugInfo.stats;
    if (failureRate === 0) return "bg-green-500";
    if (failureRate < 0.2) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (!debugInfo) return "Unknown";

    const { failureRate, totalSent } = debugInfo.stats;
    if (totalSent === 0) return "No requests";
    if (failureRate === 0) return "All delivered";
    return `${Math.round(failureRate * 100)}% failed`;
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-80 ${getStatusColor()} `}
      >
        <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
        Realtime: {getStatusText()}
      </button>

      {isExpanded && debugInfo && (
        <div className="absolute top-12 right-0 min-w-80 rounded-lg border bg-white p-4 shadow-lg">
          <h3 className="mb-3 font-semibold">Realtime Delivery Status</h3>

          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Total Sent:</span>
                <span className="ml-2 font-medium">
                  {debugInfo.stats.totalSent}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Received:</span>
                <span className="ml-2 font-medium">
                  {debugInfo.stats.totalReceived}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Failed:</span>
                <span className="ml-2 font-medium text-red-600">
                  {debugInfo.stats.totalFailed}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Success Rate:</span>
                <span className="ml-2 font-medium">
                  {Math.round((1 - debugInfo.stats.failureRate) * 100)}%
                </span>
              </div>
            </div>

            {debugInfo.failures.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 font-medium text-red-600">
                  Recent Failures:
                </h4>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {debugInfo.failures.map((failure) => (
                    <div
                      key={failure.requestId}
                      className="rounded bg-red-50 p-2 text-xs"
                    >
                      <div>ID: {failure.requestId.slice(-8)}</div>
                      <div>From: {failure.initiatorId.slice(-8)}</div>
                      <div>To: {failure.initiateeId.slice(-8)}</div>
                      <div>
                        Age:{" "}
                        {Math.round(
                          (Date.now() - failure.sentAt.getTime()) / 1000,
                        )}
                        s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 text-xs text-gray-500">
              Last checked: {debugInfo.lastCheck.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
