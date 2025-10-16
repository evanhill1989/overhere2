// src/app/places/[placeId]/_components/CheckedInUsers.tsx
"use client";

import type { Checkin, UserId, PlaceId } from "@/lib/types/database";

import { EmptyState } from "@/components/ui/data-states";
import { Users } from "lucide-react";
import { useRealtimeMessageRequests } from "@/hooks/realtime-hooks/useRealtimeMessageRequests";
import { useMessageRequestMutation } from "@/hooks/useMessageRequestMutation";
import UserCheckInCard from "./UserCheckInCard";

type CheckedInUsersProps = {
  checkins: Checkin[];
  currentUserId: UserId;
  placeId: PlaceId;
  hasActiveSession?: boolean;
  onResumeSession?: () => void;
};

export default function CheckedInUsers({
  checkins,
  currentUserId,
  placeId,
  hasActiveSession = false,
  onResumeSession,
}: CheckedInUsersProps) {
  // Filter out current user's checkin
  const otherUsersCheckins = checkins.filter(
    (checkin) => checkin.userId !== currentUserId,
  );

  // Get message requests for this place
  const { requests } = useRealtimeMessageRequests(currentUserId, placeId);

  // Mutation for sending message requests
  const sendRequestMutation = useMessageRequestMutation();

  const handleSendRequest = async (targetUserId: UserId) => {
    try {
      await sendRequestMutation.mutateAsync({
        initiatorId: currentUserId,
        initiateeId: targetUserId,
        placeId,
      });
    } catch (error) {
      console.error("Failed to send message request:", error);
      // TODO: Show error toast
    }
  };

  // Empty state
  if (otherUsersCheckins.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">People Here</h2>
        <EmptyState
          title="Nobody else is here"
          description="Be the first to start a conversation when someone checks in!"
          icon={Users}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        People Here ({otherUsersCheckins.length})
      </h2>

      <div className="space-y-3">
        {otherUsersCheckins.map((checkin) => (
          <UserCheckInCard
            key={checkin.id}
            checkin={checkin}
            currentUserId={currentUserId}
            placeId={placeId}
            requests={requests}
            hasActiveSession={hasActiveSession}
            onSendRequest={() => handleSendRequest(checkin.userId)}
            onResumeSession={onResumeSession}
            isRequestPending={sendRequestMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
