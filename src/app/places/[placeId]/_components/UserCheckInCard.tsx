// src/app/places/[placeId]/_components/UserCheckInCard.tsx
"use client";

import type {
  Checkin,
  UserId,
  PlaceId,
  MessageRequest,
} from "@/lib/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hand, MessageCircle } from "lucide-react";

type UserCheckInCardProps = {
  checkin: Checkin;
  currentUserId: UserId;
  placeId: PlaceId;
  requests: MessageRequest[];
  hasActiveSession: boolean;
  onSendRequest: () => void;
  onResumeSession?: () => void;
  isRequestPending: boolean;
};

export default function UserCheckInCard({
  checkin,
  currentUserId,
  placeId,
  requests,
  hasActiveSession,
  onSendRequest,
  onResumeSession,
  isRequestPending,
}: UserCheckInCardProps) {
  // Find relevant requests for this user pair at this place
  const myRequestToThem = requests.find(
    (r) =>
      r.initiatorId === currentUserId &&
      r.initiateeId === checkin.userId &&
      r.placeId === placeId,
  );

  const theirRequestToMe = requests.find(
    (r) =>
      r.initiatorId === checkin.userId &&
      r.initiateeId === currentUserId &&
      r.placeId === placeId,
  );

  // Determine card state
  const getCardState = () => {
    // If current user has active session with someone else, show resume button for that person
    if (hasActiveSession) {
      // We'd need to check if this specific user is part of the active session
      // For now, we'll show a disabled state for other users
      return {
        buttonText: "In Session",
        buttonVariant: "secondary" as const,
        buttonDisabled: true,
        showIcon: false,
      };
    }

    // If there's an incoming request from this person
    if (theirRequestToMe?.status === "pending") {
      return {
        buttonText: "Incoming Request",
        buttonVariant: "secondary" as const,
        buttonDisabled: true,
        showIcon: true,
        iconType: "pulse" as const,
      };
    }

    // If current user sent a request to this person
    if (myRequestToThem) {
      switch (myRequestToThem.status) {
        case "pending":
          return {
            buttonText: "Request Sent",
            buttonVariant: "outline" as const,
            buttonDisabled: true,
            showIcon: true,
            iconType: "wave" as const,
          };
        case "rejected":
          return {
            buttonText: "Request Declined",
            buttonVariant: "outline" as const,
            buttonDisabled: true,
            showIcon: false,
          };
        case "accepted":
          return {
            buttonText: "Resume Chat",
            buttonVariant: "default" as const,
            buttonDisabled: false,
            showIcon: true,
            iconType: "message" as const,
            onClick: onResumeSession,
          };
        default:
          break;
      }
    }

    // Default: Available to send request
    return {
      buttonText: isRequestPending ? "Sending..." : "Request to Chat",
      buttonVariant: "default" as const,
      buttonDisabled: isRequestPending,
      showIcon: false,
      onClick: onSendRequest,
    };
  };

  const cardState = getCardState();

  return (
    <Card className="flex items-center justify-between p-4">
      <div className="flex-1">
        <p className="flex items-center gap-2 font-medium">
          {checkin.topic || "Open to chat"}
          {cardState.showIcon && cardState.iconType === "pulse" && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          )}
          {cardState.showIcon && cardState.iconType === "wave" && (
            <Hand size={16} className="text-muted-foreground" />
          )}
        </p>
        <p className="text-muted-foreground text-sm capitalize">
          {checkin.checkinStatus}
        </p>
      </div>

      <Button
        variant={cardState.buttonVariant}
        disabled={cardState.buttonDisabled}
        onClick={cardState.onClick}
        className="shrink-0"
      >
        {cardState.showIcon && cardState.iconType === "message" && (
          <MessageCircle size={16} className="mr-2" />
        )}
        {cardState.buttonText}
      </Button>
    </Card>
  );
}
