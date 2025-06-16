"use client";

import { useState, useTransition } from "react";
import { respondToMessageRequest } from "@/app/_actions/messageActions";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePollMessageRequests } from "@/hooks/usePollMessageRequests";

// Unified status type across server + UI
type RequestStatus = "pending" | "accepted" | "rejected" | "canceled";

export function IncomingRequests({ currentUserId }: { currentUserId: string }) {
  const { requests, isLoading } = usePollMessageRequests(currentUserId);
  const [isPending, startTransition] = useTransition();

  // Optimistic local status overrides
  const [localStatusMap, setLocalStatusMap] = useState<
    Record<string, RequestStatus>
  >({});

  const handleAction = (id: string, action: RequestStatus) => {
    // Optimistically mark status
    setLocalStatusMap((prev) => ({ ...prev, [id]: action }));

    startTransition(async () => {
      const res = await respondToMessageRequest({
        requestId: id,
        userId: currentUserId,
        action,
      });

      // Revert if server rejects
      if (!res.success) {
        setLocalStatusMap((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        alert(res.message); // or use toast()
      }
    });
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading requests...
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {requests.length === 0 ? (
        <li className="text-muted-foreground">No incoming requests.</li>
      ) : (
        requests.map((req) => {
          const isInitiator = req.initiatorId === currentUserId;
          const currentStatus: RequestStatus =
            localStatusMap[req.id] || req.status;

          return (
            <li key={req.id} className="rounded-md border p-4">
              <p className="text-sm font-medium">
                {isInitiator
                  ? "You sent a wave."
                  : `Someone nearby is open to saying hi.`}
              </p>
              <p className="text-muted-foreground text-sm capitalize">
                Status: {currentStatus}
              </p>

              {currentStatus === "pending" && (
                <div className="mt-3 flex gap-2">
                  {isInitiator ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleAction(req.id, "canceled")}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleAction(req.id, "accepted")}
                      >
                        Sure
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleAction(req.id, "rejected")}
                      >
                        Not Now
                      </Button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })
      )}
    </ul>
  );
}
