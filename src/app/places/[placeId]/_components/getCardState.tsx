// src/app/places/[placeId]/_components/cardState.ts

import { UserCheckInCardProps } from "./UserCheckInCard";

type IconType = "pulse" | "wave" | "message" | null;

export type CardState = {
  text: string;
  variant: "default" | "secondary" | "outline";
  disabled: boolean;
  icon: IconType;
  onClick?: () => void;
};

export function getCardState({
  currentUserId,
  checkin,
  placeId,
  requests,
  hasActiveSession,
  isRequestPending,
  onSendRequest,
  onResumeSession,
}: UserCheckInCardProps): CardState {
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

  if (hasActiveSession) {
    return {
      text: "In Session",
      variant: "secondary",
      disabled: true,
      icon: null,
    };
  }

  if (theirRequestToMe?.status === "pending") {
    return {
      text: "Incoming Request",
      variant: "secondary",
      disabled: true,
      icon: "pulse",
    };
  }

  if (myRequestToThem) {
    switch (myRequestToThem.status) {
      case "pending":
        return {
          text: "Request Sent",
          variant: "outline",
          disabled: true,
          icon: "wave",
        };
      case "rejected":
        return {
          text: "Request Declined",
          variant: "outline",
          disabled: true,
          icon: null,
        };
      case "accepted":
        return {
          text: "Resume Chat",
          variant: "default",
          disabled: false,
          icon: "message",
          onClick: onResumeSession,
        };
    }
  }

  // Default: available
  return {
    text: isRequestPending ? "Sending..." : "Request to Chat",
    variant: "default",
    disabled: isRequestPending,
    icon: null,
    onClick: onSendRequest,
  };
}
