// src/components/debug/RealtimeDebugger.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRealtimeMessageRequests } from "@/hooks/realtime-hooks/useRealtimeMessageRequests";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";
import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import type { UserId, PlaceId } from "@/lib/types/database";

interface RealtimeDebuggerProps {
  userId: UserId;
  placeId: PlaceId;
  enabled?: boolean;
}

type LogEntry = {
  timestamp: string;
  type: "info" | "warning" | "error" | "success";
  source: "requests" | "session" | "checkins" | "general";
  message: string;
  data?: any;
};

export function RealtimeDebugger({
  userId,
  placeId,
  enabled = false,
}: RealtimeDebuggerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(enabled);

  // Use refs to store previous values to prevent infinite loops
  const prevRequestsRef = useRef<any>(null);
  const prevSessionRef = useRef<any>(null);
  const prevCheckinsRef = useRef<any>(null);

  // Hook into all realtime subscriptions
  const {
    requests,
    isLoading: requestsLoading,
    error: requestsError,
  } = useRealtimeMessageRequests(userId, placeId);
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useRealtimeMessageSession(userId, placeId);
  const {
    data: checkins,
    isLoading: checkinsLoading,
    error: checkinsError,
  } = useRealtimeCheckins(placeId);

  const addLog = (entry: Omit<LogEntry, "timestamp">) => {
    setLogs((prev) => [
      {
        ...entry,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 49),
    ]);
  };

  // Monitor requests state changes - using JSON.stringify for deep comparison
  useEffect(() => {
    const currentState = JSON.stringify({
      loading: requestsLoading,
      count: requests.length,
      error: !!requestsError,
      requestIds: requests.map((r) => r.id).sort(),
    });

    if (prevRequestsRef.current !== currentState) {
      prevRequestsRef.current = currentState;

      addLog({
        type: requestsError ? "error" : "info",
        source: "requests",
        message: `Requests: loading=${requestsLoading}, count=${requests.length}, error=${!!requestsError}`,
        data: {
          requestIds: requests.map((r) => r.id),
          statuses: requests.map((r) => `${r.id}:${r.status}`),
          error: requestsError?.message,
        },
      });
    }
  }, [requests.length, requestsLoading, requestsError?.message]);

  // Monitor session state changes
  useEffect(() => {
    const currentState = JSON.stringify({
      loading: sessionLoading,
      hasSession: !!session,
      sessionId: session?.id,
      status: session?.status,
      error: !!sessionError,
    });

    if (prevSessionRef.current !== currentState) {
      prevSessionRef.current = currentState;

      addLog({
        type: sessionError ? "error" : "info",
        source: "session",
        message: `Session: loading=${sessionLoading}, hasSession=${!!session}, error=${!!sessionError}`,
        data: {
          sessionId: session?.id,
          status: session?.status,
          error: sessionError?.message,
        },
      });
    }
  }, [sessionLoading, session?.id, session?.status, sessionError?.message]);

  // Monitor checkins state changes
  useEffect(() => {
    const currentState = JSON.stringify({
      loading: checkinsLoading,
      count: checkins?.length || 0,
      error: !!checkinsError,
      checkinIds: checkins?.map((c) => c.id).sort() || [],
    });

    if (prevCheckinsRef.current !== currentState) {
      prevCheckinsRef.current = currentState;

      addLog({
        type: checkinsError ? "error" : "info",
        source: "checkins",
        message: `Checkins: loading=${checkinsLoading}, count=${checkins?.length || 0}, error=${!!checkinsError}`,
        data: {
          checkinIds: checkins?.map((c) => c.id) || [],
          error: checkinsError?.message,
        },
      });
    }
  }, [checkinsLoading, checkins?.length, checkinsError?.message]);

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50"
        variant="outline"
        size="sm"
      >
        Debug
      </Button>
    );
  }

  const getStatusColor = (isLoading: boolean, hasError: boolean) => {
    if (hasError) return "bg-red-500";
    if (isLoading) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="fixed bottom-4 left-4 z-50 flex h-96 w-96 flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold">Realtime Debug</h3>
        <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm">
          ×
        </Button>
      </div>

      <div className="space-y-2 border-b p-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${getStatusColor(requestsLoading, !!requestsError)}`}
          />
          <span className="text-xs">Requests</span>
          <Badge variant="outline">{requests.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${getStatusColor(sessionLoading, !!sessionError)}`}
          />
          <span className="text-xs">Session</span>
          <Badge variant="outline">{session ? "Active" : "None"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${getStatusColor(checkinsLoading, !!checkinsError)}`}
          />
          <span className="text-xs">Checkins</span>
          <Badge variant="outline">{checkins?.length || 0}</Badge>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`rounded border-l-2 p-2 text-xs ${
              log.type === "error"
                ? "border-red-500 bg-red-50"
                : log.type === "warning"
                  ? "border-yellow-500 bg-yellow-50"
                  : log.type === "success"
                    ? "border-green-500 bg-green-50"
                    : "border-blue-500 bg-blue-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <Badge variant="outline" className="text-xs">
                {log.source}
              </Badge>
              <span className="text-gray-500">{log.timestamp}</span>
            </div>
            <div className="mt-1">{log.message}</div>
          </div>
        ))}
      </div>

      <div className="border-t p-2">
        <Button
          onClick={() => setLogs([])}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Clear Logs
        </Button>
      </div>
    </Card>
  );
}
