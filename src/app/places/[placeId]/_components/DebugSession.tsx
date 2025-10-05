// src/app/places/[placeId]/_components/SessionDebug.tsx
"use client";

import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";
import { useMessageSession } from "@/hooks/useMessageSession";
import type { UserId, PlaceId } from "@/lib/types/database";

export function DebugSession({
  userId,
  placeId,
}: {
  userId: UserId;
  placeId: PlaceId;
}) {
  const {
    data: session,
    isLoading,
    error,
  } = useRealtimeMessageSession(userId, placeId);

  return (
    <div className="rounded border p-4 text-xs">
      <h3 className="font-bold">Session Debug</h3>
      {isLoading && <p>Loading session...</p>}
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {session ? (
        <div>
          <p>✅ Active session: {session.id}</p>
          <p>Status: {session.status}</p>
          <p>Created: {session.createdAt.toLocaleString()}</p>
        </div>
      ) : (
        <p>📭 No active session</p>
      )}
    </div>
  );
}
