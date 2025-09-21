// components/CheckinList.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePollCheckins } from "@/hooks/usePollCheckins";
import { MessageRequestStatus } from "@/lib/db/types";
import { useActionState } from "react";
import { requestToMessage } from "@/app/_actions/messageActions";
import { HandWaving } from "@phosphor-icons/react";
import { usePollMessageRequests } from "@/hooks/usePollMessageRequests";

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
  const { checkins, isLoading } = usePollCheckins(placeId);
  const { requests } = usePollMessageRequests(currentUserId, placeId);

  const rejectedRequests = requests.filter(
    (r) =>
      r.initiatorId === currentUserId &&
      r.placeId === placeId &&
      r.status === "rejected",
  );

  const [requestStatus, formAction] = useActionState<
    Record<string, MessageRequestStatus>,
    FormData
  >(async (prevStatus, formData) => {
    const initiateeId = formData.get("initiateeId") as string;
    const initiatorId = formData.get("initiatorId") as string;
    const placeId = formData.get("placeId") as string;
    const input = { initiatorId, initiateeId, placeId };
    const result = await requestToMessage(input);

    return {
      ...prevStatus,
      [initiateeId]: result.success ? "sent" : "failed",
    };
  }, {});

  rejectedRequests.forEach((r) => {
    requestStatus[r.initiateeId] = "rejected";
  });

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Loading check-ins...</p>
    );
  }
  const hasIncomingRequestFrom = (checkinUserId: string) => {
    return requests.some(
      (r) =>
        r.initiatorId === checkinUserId &&
        r.initiateeId === currentUserId &&
        r.placeId === placeId &&
        r.status === "pending",
    );
  };

  const sortedCheckins = [...checkins]
    .filter((checkin) => checkin.userId !== currentUserId)
    .sort((a, b) => {
      const aPending = requestStatus[a.userId] === "pending";
      const bPending = requestStatus[b.userId] === "pending";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-4">
      {checkins.length === 0 ? (
        <p className="text-sm text-gray-500">
          No one is currently checked in here.
        </p>
      ) : (
        sortedCheckins.map((checkin) => {
          const status = requestStatus[checkin.userId];
          const isPending = status === "pending";
          const isIncoming = hasIncomingRequestFrom(checkin.userId);
          const isSessionParticipant =
            activeSession &&
            [activeSession.initiatorId, activeSession.initiateeId].includes(
              checkin.userId,
            );
          console.log(
            isSessionParticipant,
            "<<!!!!!!!!!!!-----------------isSessionParticipant in CHeckinLIST",
          );

          return (
            <Card
              key={checkin.userId}
              className={`flex flex-col items-start p-4 sm:flex-row sm:items-center sm:justify-between ${
                isPending ? "bg-muted/50" : ""
              }`}
            >
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {checkin.topic}
                  {status === "sent" && (
                    <HandWaving
                      size={32}
                      className="text-muted-foreground h-4 w-4"
                    />
                  )}
                  {status === "rejected" && (
                    <span className="text-destructive text-xs font-normal">
                      Request declined
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-sm capitalize">
                  {checkin.checkinStatus}
                </p>
              </div>

              {isIncoming ? (
                <Button
                  variant="secondary"
                  disabled
                  className="border-primary text-primary animate-pulse border"
                >
                  Incoming Request
                </Button>
              ) : isSessionParticipant ? (
                <Button
                  type="button"
                  onClick={onResumeSession}
                  className="mt-2 sm:mt-0"
                >
                  💬 Resume Messaging
                </Button>
              ) : (
                <form action={formAction}>
                  <input
                    type="hidden"
                    name="initiatorId"
                    value={currentUserId}
                  />
                  <input
                    type="hidden"
                    name="initiateeId"
                    value={checkin.userId}
                  />
                  <input type="hidden" name="placeId" value={placeId} />
                  <Button
                    type="submit"
                    variant={status === "sent" ? "outline" : "default"}
                    disabled={status === "sent"}
                    className="mt-2 sm:mt-0"
                  >
                    {status === "sent"
                      ? "Requested"
                      : status === "failed"
                        ? "Failed – Try Again"
                        : "Request to Message"}
                  </Button>
                </form>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
