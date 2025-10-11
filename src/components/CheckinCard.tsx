// src/components/CheckinCard.tsx (NEW)
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandWaving } from "@phosphor-icons/react";
import { Checkin, MessageRequest } from "@/lib/types/database";

interface CheckinCardProps {
  checkin: Checkin;
  currentUserId: string;
  requests: MessageRequest[]; // We'll type this better later
  placeId: string;
  activeSession?: { initiatorId: string; initiateeId: string };
  onResumeSession?: () => void;
  onRequest: () => void;
  isRequesting: boolean;
}

export function CheckinCard({
  checkin,
  currentUserId,
  requests,
  placeId,
  activeSession,
  onResumeSession,
  onRequest,
  isRequesting,
}: CheckinCardProps) {
  // Check if there's an incoming request from this person to current user
  const hasIncomingRequest = requests.some(
    (r) =>
      r.initiatorId === checkin.userId &&
      r.initiateeId === currentUserId &&
      r.placeId === placeId &&
      r.status === "pending",
  );

  // Check current user's request to this person
  const myRequestToThem = requests.find(
    (r) =>
      r.initiatorId === currentUserId &&
      r.initiateeId === checkin.userId &&
      r.placeId === placeId,
  );

  // Check if this person is part of active session
  const isSessionParticipant =
    activeSession &&
    [activeSession.initiatorId, activeSession.initiateeId].includes(
      checkin.userId,
    );

  return (
    <Card className="flex flex-col items-start p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-medium">
          {checkin.topic || "Open to chat"}
          {myRequestToThem?.status === "pending" && (
            <HandWaving size={16} className="text-muted-foreground" />
          )}
          {myRequestToThem?.status === "rejected" && (
            <span className="text-destructive text-xs font-normal">
              Request declined
            </span>
          )}
        </p>
        <p className="text-muted-foreground text-sm capitalize">
          {checkin.checkinStatus}
        </p>
      </div>

      {hasIncomingRequest ? (
        <Button
          variant="secondary"
          disabled
          className="border-primary text-primary animate-pulse border"
        >
          Incoming Request
        </Button>
      ) : isSessionParticipant ? (
        <Button onClick={onResumeSession} className="mt-2 sm:mt-0">
          💬 Resume Messaging
        </Button>
      ) : (
        <Button
          onClick={onRequest}
          variant={
            myRequestToThem?.status === "pending" ? "outline" : "default"
          }
          disabled={myRequestToThem?.status === "pending" || isRequesting}
          className="mt-2 sm:mt-0"
        >
          {isRequesting
            ? "Sending..."
            : myRequestToThem?.status === "pending"
              ? "Requested"
              : "Request to Message"}
        </Button>
      )}
    </Card>
  );
}
