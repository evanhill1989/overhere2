// src/app/places/[placeId]/_components/cardState.ts

import type {
  Checkin,
  MessageRequest,
  MessageSession, // ✅ Import MessageSession
  UserId,
  PlaceId,
  RequestId,
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
  placeId: PlaceId; // 💡 FIX 1: Allow requests to be undefined (when TanStack Query is loading)
  requests: MessageRequest[] | undefined;
  activeSession?: MessageSession;
  isRequestPending: boolean;
  onSendRequest: () => void;
  onResumeSession?: () => void;
  onAcceptRequest?: (requestId: RequestId) => void;
  onRejectRequest?: (requestId: RequestId) => void;
};

export function getCardState({
  currentUserId,
  checkin,
  placeId,
  requests, // Now typed as MessageRequest[] | undefined
  activeSession,
  isRequestPending,
  onSendRequest,
  onResumeSession,
  onAcceptRequest,
  onRejectRequest,
}: CardStateProps): CardState {
  // 💡 FIX 2: Use Nullish Coalescing (??) to ensure requests is an array before using .find()
  const safeRequests = requests ?? [];

  const checkinUserId = checkin.userId; // Find incoming request from the other user to the current user
  // NOTE: Using safeRequests here prevents the 'Cannot read properties of undefined (reading 'find')' error
  const theirRequestToMe = safeRequests.find(
    (r) =>
      r.initiatorId === checkinUserId &&
      r.initiateeId === currentUserId &&
      r.placeId === placeId,
  ); // Find outgoing request from the current user to the other user

  const myRequestToThem = safeRequests.find(
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
      text: `Chat${isTheyTheInitiator ? " (they started)" : " (you started)"}`,
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
      text: "Accept Chat",
      variant: "secondary",
      disabled: false,
      icon: "pulse",
      onClick: () => onAcceptRequest?.(theirRequestToMe.id),
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
