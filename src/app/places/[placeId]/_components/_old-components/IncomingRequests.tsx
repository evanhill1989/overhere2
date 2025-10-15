// src/components/IncomingRequests.tsx
"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { useRealtimeMessageRequests } from "@/hooks/realtime-hooks/useRealtimeMessageRequests"; // ✅ Changed

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { respondToMessageRequest } from "@/app/_actions/messageActions";
import type { PlaceId, UserId } from "@/lib/types/database";

type IncomingRequestsProps = {
  currentUserId: UserId;
  placeId: PlaceId;
};

type OptimisticState = Record<string, "accepted" | "rejected">;

export default function IncomingRequests({
  currentUserId,
  placeId,
}: IncomingRequestsProps) {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`🎨 IncomingRequests render #${renderCount.current}`, {
    currentUserId,
    placeId,
  });

  const { requests, isLoading } = useRealtimeMessageRequests(
    currentUserId,
    placeId,
  );

  console.log("📨 IncomingRequests data:", {
    requestsCount: requests.length,
    isLoading,
    requestIds: requests.map((r) => r.id),
  });

  const [optimisticState, setOptimisticState] = useState<OptimisticState>({});
  const [state, formAction] = useActionState(respondToMessageRequest, {
    message: "",
  });

  const filtered = requests.filter(
    (r) =>
      r.placeId === placeId &&
      r.status === "pending" &&
      r.initiatorId !== currentUserId,
  );

  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading requests...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No one's trying to connect right now.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {filtered.map((req) => {
        const optimistic = optimisticState[req.id];

        if (optimistic === "accepted") {
          return (
            <Card key={req.id} className="p-4 text-center">
              <p className="text-muted-foreground text-sm">
                Opening messaging window…
              </p>
            </Card>
          );
        }

        if (optimistic === "rejected") {
          return null;
        }

        return (
          <li key={req.id}>
            <Card className="p-4">
              <p className="text-sm font-medium">
                Someone nearby is open to saying hi.
              </p>
              {req.topic && (
                <p className="text-muted-foreground text-sm italic">
                  They're open to talking about: {req.topic}
                </p>
              )}

              <form
                action={(formData) => {
                  const requestId = req.id;
                  const response = formData.get("response") as
                    | "accepted"
                    | "rejected";
                  setOptimisticState((prev) => ({
                    ...prev,
                    [requestId]: response,
                  }));
                  formAction(formData);
                }}
                className="mt-3 flex gap-2"
              >
                <input type="hidden" name="requestId" value={req.id} />
                <OptimisticSubmitButton
                  name="response"
                  value="accepted"
                  label="Sure"
                />
                <OptimisticSubmitButton
                  name="response"
                  value="rejected"
                  label="Not now"
                />
              </form>

              {state.message && (
                <p className="text-muted-foreground mt-2 text-xs italic">
                  {state.message}
                </p>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function OptimisticSubmitButton({
  label,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </Button>
  );
}
