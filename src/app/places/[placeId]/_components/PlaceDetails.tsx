// Updated PlaceDetails.tsx - Working with current PlacePageClient structure
"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/data-states";
import { Users } from "lucide-react";
import { useRealtimeMessageRequests } from "@/hooks/realtime-hooks/useRealtimeMessageRequests";
import { useMessageRequestMutation } from "@/hooks/useMessageRequestMutation";

import type {
  Checkin,
  MessageSession, // ✅ Use proper MessageSession type
  UserId,
  PlaceId,
} from "@/lib/types/database";
import PersonCard from "./PersonCard";
import { useMessageRequestResponse } from "@/hooks/useMessageRequestResponse";
import { useUnreadMessageCounts } from "@/hooks/useUnreadMessageCounts";
import { useRealtimeUnreadUpdates } from "@/hooks/useRealtimeUnreadUpdates";

import type { PlaceVerificationDetails } from "@/lib/types/database";
import { VerificationBadge } from "@/components/verification/VerificationBadge";

type PlaceDetailsProps = {
  place: { id: PlaceId; name: string; address: string };
  checkins: Checkin[];
  currentUserId: UserId;
  activeSession?: MessageSession; // ✅ Use MessageSession instead of generic object
  onResumeSession?: () => void;
  onOpenMessaging: (sessionId?: string) => void;
  isCheckinsLoading: boolean;
  checkinsError: Error | null;
  messagingState: string; // From current PlacePageClient
  hasActiveSession: boolean; // From current PlacePageClient
  isPrimed: boolean;
  verificationDetails: PlaceVerificationDetails | null; // NEW
  onOpenVerificationModal: () => void; // NEW
};

export function PlaceDetails({
  place,
  verificationDetails, // NEW
  onOpenVerificationModal, // NEW
  checkins,
  currentUserId,
  activeSession,
  onResumeSession,
  isPrimed,
}: PlaceDetailsProps) {
  const { requests } = useRealtimeMessageRequests(
    currentUserId,
    place.id,
    isPrimed,
  );
  const sendRequestMutation = useMessageRequestMutation();

  const { acceptRequest, rejectRequest } = useMessageRequestResponse();

  const { data: unreadCounts = {} } = useUnreadMessageCounts(
    place.id,
    currentUserId,
    isPrimed,
  );

  useRealtimeUnreadUpdates(place.id, currentUserId, isPrimed);

  const handleSendRequest = async (targetUserId: UserId) => {
    try {
      await sendRequestMutation.mutateAsync({
        initiatorId: currentUserId, // ✅ Type system ensures correct assignment
        initiateeId: targetUserId, // ✅ Type system ensures correct assignment
        placeId: place.id,
      });
    } catch (error) {}
  };

  // Filter out current user's checkin
  const otherPeopleCheckins = checkins.filter(
    (checkin) => checkin.userId !== currentUserId,
  );

  // Smart sorting using proper MessageSession typing
  const sortedPeople = useMemo(() => {
    return [...otherPeopleCheckins].sort((a, b) => {
      // 1. Incoming requests to me - TOP PRIORITY
      const aRequestingMe = requests.find(
        (r) =>
          r.initiatorId === a.userId &&
          r.initiateeId === currentUserId &&
          r.status === "pending",
      );
      const bRequestingMe = requests.find(
        (r) =>
          r.initiatorId === b.userId &&
          r.initiateeId === currentUserId &&
          r.status === "pending",
      );

      if (aRequestingMe && !bRequestingMe) return -1;
      if (!aRequestingMe && bRequestingMe) return 1;

      // 2. People I have active sessions with - SECOND PRIORITY
      // ✅ Using proper MessageSession type - no confusion about initiator/initiatee
      const aInSession =
        activeSession &&
        (activeSession.initiatorId === a.userId ||
          activeSession.initiateeId === a.userId);
      const bInSession =
        activeSession &&
        (activeSession.initiatorId === b.userId ||
          activeSession.initiateeId === b.userId);

      if (aInSession && !bInSession) return -1;
      if (!aInSession && bInSession) return 1;

      // 3. Everyone else - random order
      return 0;
    });
  }, [otherPeopleCheckins, requests, currentUserId, activeSession]);

  if (sortedPeople.length === 0) {
    return (
      <section className="space-y-6">
        <header className="border-border/40 bg-card/30 space-y-2 rounded-xl border p-6 text-center backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{place.name}</h1>

            {/* NEW: Verification Badge */}
            {verificationDetails?.isVerified && (
              <VerificationBadge onClick={onOpenVerificationModal} />
            )}
          </div>
          <p className="text-muted-foreground/90 text-sm">{place.address}</p>
          {verificationDetails?.customDescription && (
            <div className="border-primary bg-primary/5 mt-3 border-l-4 py-2 pl-4">
              <p className="text-foreground text-sm italic">
                {verificationDetails.customDescription}
              </p>
            </div>
          )}
        </header>

        <div className="flex min-h-[50vh] items-center justify-center">
          <EmptyState
            title="Nobody else is here"
            description="Be the first to start a conversation when someone checks in!"
            icon={Users}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="border-border/40 bg-card/30 space-y-2 rounded-xl border p-6 text-center backdrop-blur-sm">
        <h1 className="text-3xl font-bold tracking-tight">{place.name}</h1>
        <p className="text-muted-foreground/90 text-sm">{place.address}</p>
      </header>

      <div className="space-y-4">
        {sortedPeople.map((checkin) => (
          <PersonCard
            key={checkin.id}
            checkin={checkin}
            currentUserId={currentUserId}
            placeId={place.id}
            requests={requests}
            activeSession={activeSession}
            onSendRequest={() => handleSendRequest(checkin.userId)}
            onResumeSession={onResumeSession}
            isRequestPending={sendRequestMutation.isPending}
            onAcceptRequest={acceptRequest}
            onRejectRequest={rejectRequest}
            unreadCount={unreadCounts[checkin.id] || 0}
          />
        ))}
      </div>
    </section>
  );
}
