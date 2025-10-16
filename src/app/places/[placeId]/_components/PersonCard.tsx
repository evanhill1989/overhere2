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
} from "@/lib/types/database";

type PersonCardProps = {
  checkin: Checkin;
  currentUserId: UserId;
  placeId: PlaceId;
  requests: MessageRequest[];
  activeSession?: MessageSession; // ✅ Use MessageSession, not generic object
  onSendRequest: () => void;
  onResumeSession?: () => void;
  isRequestPending: boolean;
};

export default function PersonCard({
  checkin,
  currentUserId,

  requests,
  activeSession,
  onSendRequest,
  onResumeSession,
  isRequestPending,
}: PersonCardProps) {
  // ✅ Type-safe request lookups using MessageRequest schema
  const incomingRequest = requests.find(
    (r) =>
      r.initiatorId === checkin.userId &&
      r.initiateeId === currentUserId &&
      r.status === "pending",
  );

  const myRequestToThem = requests.find(
    (r) => r.initiatorId === currentUserId && r.initiateeId === checkin.userId,
  );

  // ✅ Type-safe session participant check using MessageSession
  // No confusion about initiator vs initiatee - the types ensure correctness
  const isInActiveSession =
    activeSession &&
    (activeSession.initiatorId === checkin.userId ||
      activeSession.initiateeId === checkin.userId);

  // ✅ Helper function to get the other participant's role in the session
  const getSessionRole = (): "initiator" | "initiatee" | null => {
    if (!activeSession || !isInActiveSession) return null;
    return activeSession.initiatorId === checkin.userId
      ? "initiator"
      : "initiatee";
  };

  // Determine card state with proper type safety
  const getCardState = () => {
    if (incomingRequest) {
      return {
        text: "Wants to chat",
        variant: "secondary" as const,
        disabled: true,
        icon: (
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
        ),
        className: "border-green-200 bg-green-50",
      };
    }

    if (isInActiveSession) {
      // ✅ We can safely show session details because types guarantee consistency
      const sessionRole = getSessionRole();
      return {
        text: `Resume Chat${sessionRole === "initiator" ? " (they started)" : " (you started)"}`,
        variant: "default" as const,
        disabled: false,
        icon: <Chat size={16} />,
        onClick: onResumeSession,
        className: "border-blue-200 bg-blue-50",
      };
    }

    if (myRequestToThem) {
      switch (myRequestToThem.status) {
        case "pending":
          return {
            text: "Request sent",
            variant: "outline" as const,
            disabled: true,
            icon: <HandWaving size={16} className="text-muted-foreground" />,
            className: "",
          };
        case "rejected":
          return {
            text: "Not interested",
            variant: "outline" as const,
            disabled: true,
            icon: null,
            className: "opacity-60",
          };
        case "accepted":
          // This should trigger session creation, so we shouldn't see this state
          return {
            text: "Request accepted",
            variant: "default" as const,
            disabled: false,
            icon: <Chat size={16} />,
            onClick: onResumeSession,
            className: "border-blue-200 bg-blue-50",
          };
      }
    }

    // Default: available to request
    return {
      text: isRequestPending ? "Sending..." : "Request to chat",
      variant: "default" as const,
      disabled: isRequestPending,
      icon: null,
      onClick: onSendRequest,
      className: "",
    };
  };

  const cardState = getCardState();

  return (
    <Card className={`p-4 transition-all ${cardState.className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">{checkin.topic || "Open to chat"}</p>
          <p className="text-muted-foreground text-sm capitalize">
            {checkin.checkinStatus}
          </p>
          {/* ✅ Debug info showing session details with type safety */}
          {isInActiveSession && activeSession && (
            <p className="text-xs text-blue-600">
              Session: {activeSession.id} ({activeSession.status})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {cardState.icon}
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
