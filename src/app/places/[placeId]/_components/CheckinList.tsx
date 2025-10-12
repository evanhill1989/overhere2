// src/app/places/[placeId]/_components/CheckinList.tsx (UPDATED)
"use client";

import { DataSection, EmptyState } from "@/components/ui/data-states";
import { CheckinCard } from "@/components/CheckinCard";
import { Users } from "lucide-react";

import { useMessageSendRequest } from "@/hooks/useMessageSendRequest";
import { useRealtimeMessageRequests } from "@/hooks/realtime-hooks/useRealtimeMessageRequests";
// ✅ REMOVED: import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";

import type { PlaceId, UserId, Checkin } from "@/lib/types/database";

export function CheckinList({
  placeId,
  currentUserId,
  activeSession,
  onResumeSession,
  // ✅ ADD: Receive data as props instead of fetching
  checkins,
  isCheckinsLoading,
  checkinsError,
}: {
  placeId: PlaceId;
  currentUserId: UserId;
  activeSession?: { initiatorId: string; initiateeId: string };
  onResumeSession?: () => void;
  // ✅ ADD: Props for checkins data
  checkins: Checkin[];
  isCheckinsLoading: boolean;
  checkinsError: Error | null;
}) {
  const { requests } = useRealtimeMessageRequests(currentUserId, placeId);
  const sendRequest = useMessageSendRequest();

  const otherCheckins = checkins.filter(
    (checkin) => checkin.userId !== currentUserId,
  );

  return (
    <DataSection
      title="People Here"
      isLoading={isCheckinsLoading} // ✅ Use prop
      error={checkinsError} // ✅ Use prop
      isEmpty={otherCheckins.length === 0}
      emptyState={
        <EmptyState
          title="Nobody else is here"
          description="Be the first to start a conversation when someone checks in!"
          icon={Users}
        />
      }
    >
      <div className="space-y-3">
        {otherCheckins.map((checkin) => {
          console.log("🔍 Checkin data:", checkin);
          console.log("🔍 User ID from checkin:", checkin.userId);

          return (
            <CheckinCard
              key={checkin.id}
              checkin={checkin}
              currentUserId={currentUserId}
              requests={requests}
              placeId={placeId}
              activeSession={activeSession}
              onResumeSession={onResumeSession}
              onRequest={() => {
                console.log("🚀 Sending request:", {
                  initiatorId: currentUserId,
                  initiateeId: checkin.userId,
                  placeId: placeId,
                });

                sendRequest.submitRequest(
                  currentUserId,
                  checkin.userId,
                  placeId,
                );
              }}
              isRequesting={sendRequest.isPending}
            />
          );
        })}
      </div>
    </DataSection>
  );
}
