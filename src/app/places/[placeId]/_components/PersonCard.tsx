// PersonCard.tsx - Using robust MessageSession typing
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandWaving, Chat } from "@phosphor-icons/react";

import type {
  Checkin,
  MessageRequest,
  MessageSession, // ✅ Proper MessageSession type
  UserId,
  PlaceId,
  RequestId,
} from "@/lib/types/database";
import { getCardState, CardStateProps } from "./getCardState"; // ✅ Import CardStateProps and getCardState

// Define the icons mapping locally or import it if the utility needs it.
// For now, we'll map the string icons from getCardState to the React components.
const iconMap = {
  pulse: <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />,
  wave: <HandWaving size={16} className="text-muted-foreground" />,
  message: <Chat size={16} />,
  null: null,
};

type PersonCardProps = {
  checkin: Checkin;
  currentUserId: UserId;
  placeId: PlaceId;
  requests: MessageRequest[];
  activeSession?: MessageSession;
  onSendRequest: () => void;
  onResumeSession?: () => void;
  isRequestPending: boolean;
  // ✅ Properly typed handlers
  onAcceptRequest: (requestId: RequestId) => void;
  onRejectRequest: (requestId: RequestId) => void;
};

export default function PersonCard({
  checkin,
  currentUserId,
  placeId, // ✅ Ensure placeId is available for filtering requests in utility
  requests,
  activeSession,
  onSendRequest,
  onResumeSession,
  isRequestPending,
  onAcceptRequest,
  onRejectRequest,
}: PersonCardProps) {
  // Determine if the current card's user is a participant in the active session
  const isInActiveSession =
    activeSession &&
    (activeSession.initiatorId === checkin.userId ||
      activeSession.initiateeId === checkin.userId);

  // Prepare props object for the utility function, aligning with the new type
  const getCardStatePropsObj: CardStateProps = {
    currentUserId,
    checkin,
    placeId, // Passed for request filtering
    requests,
    activeSession: isInActiveSession ? activeSession : undefined, // Only pass if it's the right session
    onSendRequest,
    onResumeSession,
    isRequestPending,
    onAcceptRequest,
    onRejectRequest,
  };

  const cardState = getCardState(getCardStatePropsObj);

  return (
    <Card className={`p-4 transition-all ${cardState.className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">{checkin.topic || "Open to chat"}</p>
          <p className="text-muted-foreground text-sm capitalize">
            {checkin.checkinStatus}
          </p>
          {/* Debug info showing session details */}
          {isInActiveSession && activeSession && (
            <p className="text-xs text-blue-600">
              Session: {activeSession.id} ({activeSession.status})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Map the string icon from utility to the React component */}
          {iconMap[cardState.icon as keyof typeof iconMap]}
          <Button
            variant={cardState.variant}
            disabled={cardState.disabled}
            onClick={cardState.onClick}
            size="sm"
          >
            {cardState.text}
          </Button>
        </div>
      </div>
    </Card>
  );
}
