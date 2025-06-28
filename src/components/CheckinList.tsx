// components/CheckinList.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePollCheckins } from "@/hooks/usePollCheckins";
import { MessageRequestStatus } from "@/lib/db/types";
import { useActionState } from "react";
import { requestToMessage } from "@/app/_actions/messageActions";

export function CheckinList({
  placeId,
  currentUserId,
}: {
  placeId: string;
  currentUserId: string;
}) {
  const { checkins, isLoading } = usePollCheckins(placeId);

  const [requestStatus, formAction] = useActionState<
    Record<string, MessageRequestStatus>,
    FormData
  >(
    async (
      prevStatus: Record<string, MessageRequestStatus>,
      formData: FormData,
    ): Promise<Record<string, MessageRequestStatus>> => {
      const initiateeId = formData.get("initiateeId") as string;
      const initiatorId = formData.get("initiatorId") as string;
      const placeId = formData.get("placeId") as string;

      const result = await requestToMessage({
        initiatorId,
        initiateeId,
        placeId,
      });

      return {
        ...prevStatus,
        [initiateeId]: result.success ? "sent" : "failed",
      };
    },
    {} satisfies Record<string, MessageRequestStatus>,
  );

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Loading check-ins...</p>
    );
  }

  return (
    <div className="space-y-4">
      {checkins.length === 0 ? (
        <p className="text-sm text-gray-500">
          No one is currently checked in here.
        </p>
      ) : (
        checkins.map((checkin) => {
          const isCurrentUser = checkin.userId === currentUserId;
          if (isCurrentUser) return null; // ⬅️ Skip rendering current user

          const status = requestStatus[checkin.userId];

          return (
            <Card
              key={checkin.userId}
              className="flex flex-col items-start p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {isCurrentUser ? "You" : checkin.topic || "Available"}
                </p>
                <p className="text-muted-foreground text-sm capitalize">
                  {checkin.status}
                </p>
              </div>

              {!isCurrentUser && (
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
