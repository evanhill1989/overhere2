"use client";

import { useActionState } from "react";
import { requestMessage } from "@/app/_actions/messageActions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SelectCheckin, MessageRequestStatus } from "@/lib/db/types";

type PlaceDetailsProps = {
  place: { id: string; name: string; address: string };
  checkins: SelectCheckin[];
  currentUserId: string;
};

export function PlaceDetails({
  place,
  checkins,
  currentUserId,
}: PlaceDetailsProps) {
  const [requestStatus, formAction] = useActionState<
    Record<string, MessageRequestStatus>,
    FormData
  >(
    async (
      prevStatus: Record<string, MessageRequestStatus>,
      formData: FormData,
    ): Promise<Record<string, MessageRequestStatus>> => {
      const recipientId = formData.get("recipientId") as string;
      const senderId = formData.get("senderId") as string;
      const placeId = formData.get("placeId") as string;

      const result = await requestMessage({ senderId, recipientId, placeId });

      return {
        ...prevStatus,
        [recipientId]: result.success ? "sent" : "failed",
      };
    },
    {} satisfies Record<string, MessageRequestStatus>,
  );

  return (
    <section className="space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">{place.name}</h1>
        <p className="text-muted-foreground text-sm">{place.address}</p>
      </header>

      <div className="space-y-4">
        {checkins.length === 0 ? (
          <p className="text-sm text-gray-500">
            No one is currently checked in here.
          </p>
        ) : (
          checkins.map((checkin) => {
            const isCurrentUser = checkin.userId === currentUserId;
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
                      name="senderId"
                      value={currentUserId}
                    />
                    <input
                      type="hidden"
                      name="recipientId"
                      value={checkin.userId}
                    />
                    <input type="hidden" name="placeId" value={place.id} />

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
    </section>
  );
}
