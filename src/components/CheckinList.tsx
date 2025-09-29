// src/components/CheckinList.tsx (UPDATE - Add debugging)
"use client";

import { DataSection, EmptyState } from "@/components/ui/data-states";
import { CheckinCard } from "@/components/CheckinCard";
import { Users } from "lucide-react";

import { useMessageSendRequest } from "@/hooks/useMessageSendRequest";
import { useRealtimeMessageRequests } from "@/hooks/useRealtimeMessageRequests";
import { useRealtimeCheckins } from "@/hooks/useRealtimeCheckins";

export function CheckinList({
  placeId,
  currentUserId,
  activeSession,
  onResumeSession,
}: {
  placeId: string;
  currentUserId: string;
  activeSession?: { initiatorId: string; initiateeId: string };
  onResumeSession?: () => void;
}) {
  const {
    data: checkins = [],
    isLoading,
    error,
    refetch,
  } = useRealtimeCheckins(placeId);

  const { requests } = useRealtimeMessageRequests(currentUserId, placeId);
  const sendRequest = useMessageSendRequest();

  const otherCheckins = checkins.filter(
    (checkin) => checkin.userId !== currentUserId,
  );

  return (
    <DataSection
      title="People Here"
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
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
          // ✅ ADD: Debug logging
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
                // ✅ ADD: Debug logging before sending request
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
