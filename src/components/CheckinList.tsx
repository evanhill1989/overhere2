// src/components/CheckinList.tsx (ULTRA CLEAN VERSION - NOW WORKS!)
"use client";

import { useCheckins } from "@/hooks/useCheckins";

import { useRealtimeMessageRequests } from "@/hooks/useRealtimeMessageRequests";
import { DataSection, EmptyState } from "@/components/ui/data-states";

import { Users } from "lucide-react";
import { useMessageRequestMutation } from "@/hooks/useMessageRequestMutation";
import { CheckinCard } from "./CheckinCard";

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
  } = useCheckins(placeId);
  const { requests } = useRealtimeMessageRequests(currentUserId, placeId);
  const sendRequest = useMessageRequestMutation();

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
        {otherCheckins.map((checkin) => (
          <CheckinCard
            key={checkin.id}
            checkin={checkin}
            currentUserId={currentUserId}
            requests={requests}
            placeId={placeId}
            activeSession={activeSession}
            onResumeSession={onResumeSession}
            onRequest={() =>
              sendRequest.mutate({
                initiatorId: currentUserId,
                initiateeId: checkin.userId,
                placeId,
              })
            }
            isRequesting={sendRequest.isPending}
          />
        ))}
      </div>
    </DataSection>
  );
}
