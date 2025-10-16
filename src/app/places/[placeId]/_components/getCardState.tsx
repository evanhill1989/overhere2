// src/app/places/[placeId]/_components/cardState.ts

import type {
  Checkin,
  MessageRequest,
  MessageSession, // ✅ Import MessageSession
  UserId,
  PlaceId,
} from "@/lib/types/database";

type IconType = "pulse" | "wave" | "message" | null;

export type CardState = {
  text: string;
  variant: "default" | "secondary" | "outline";
  disabled: boolean;
  icon: IconType;
  onClick?: () => void;
  className?: string; // ✅ Added optional className for card styling
};

// Renamed from UserCheckInCardProps for clarity and accuracy
export type CardStateProps = {
  currentUserId: UserId;
  checkin: Checkin;
  placeId: PlaceId;
  requests: MessageRequest[];
  // ✅ Changed from boolean 'hasActiveSession' to the optional object 'activeSession'
  activeSession?: MessageSession;
  isRequestPending: boolean;
  onSendRequest: () => void;
  onResumeSession?: () => void;
};

export function getCardState({
  currentUserId,
  checkin,
  placeId,
  requests,
  activeSession, // ✅ Now the optional MessageSession object
  isRequestPending,
  onSendRequest,
  onResumeSession,
}: CardStateProps): CardState {
  const checkinUserId = checkin.userId;

  // Find incoming request from the other user to the current user
  const theirRequestToMe = requests.find(
    (r) =>
      r.initiatorId === checkinUserId &&
      r.initiateeId === currentUserId &&
      r.placeId === placeId,
  );

  // Find outgoing request from the current user to the other user
  const myRequestToThem = requests.find(
    (r) =>
      r.initiatorId === currentUserId &&
      r.initiateeId === checkinUserId &&
      r.placeId === placeId,
  );

  // ## Active Session State
  if (activeSession) {
    // Determine the role for display text
    const sessionRole =
      activeSession.initiatorId === checkinUserId ? "initiator" : "initiatee";

    // Determine if the card user is the initiator (they started) or the initiatee (you started)
    const isTheyTheInitiator = sessionRole === "initiator";

    return {
      text: `Resume Chat${isTheyTheInitiator ? " (they started)" : " (you started)"}`,
      variant: "default",
      disabled: false,
      icon: "message",
      onClick: onResumeSession,
      className: "border-blue-200 bg-blue-50",
    };
  }

  // ## Incoming Request State
  if (theirRequestToMe?.status === "pending") {
    return {
      text: "Wants to chat",
      variant: "secondary",
      disabled: true,
      icon: "pulse",
      className: "border-green-200 bg-green-50",
    };
  }

  // ## Outgoing Request States
  if (myRequestToThem) {
    switch (myRequestToThem.status) {
      case "pending":
        return {
          text: "Request sent",
          variant: "outline",
          disabled: true,
          icon: "wave",
          className: "",
        };
      case "rejected":
        return {
          text: "Not interested", // Used 'Not interested' to match original component
          variant: "outline",
          disabled: true,
          icon: null,
          className: "opacity-60",
        };
      case "accepted":
        // This state should typically lead to session creation and fall into the first check,
        // but included for completeness as per the original commented-out code.
        return {
          text: "Request accepted",
          variant: "default",
          disabled: false,
          icon: "message",
          onClick: onResumeSession,
          className: "border-blue-200 bg-blue-50",
        };
    }
  }

  // ## Default: Available to Request
  return {
    text: isRequestPending ? "Sending..." : "Request to chat", // Used 'Request to chat' to match original component
    variant: "default",
    disabled: isRequestPending,
    icon: null,
    onClick: onSendRequest,
    className: "",
  };
}
