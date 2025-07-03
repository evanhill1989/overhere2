"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { respondToMessageRequest } from "@/app/_actions/messageActions";
import { usePollMessageRequests } from "@/hooks/usePollMessageRequests";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type IncomingRequestsProps = {
  currentUserId: string;
  placeId: string;
};

type RequestStatus = "pending" | "accepted" | "rejected" | "canceled";

type OptimisticState = Record<string, "accepted" | "rejected">;

export default function IncomingRequests({
  currentUserId,
  placeId,
}: IncomingRequestsProps) {
  const { requests, isLoading } = usePollMessageRequests(
    currentUserId,
    placeId,
  );
  const [optimisticState, setOptimisticState] = useState<OptimisticState>({});
  const [state, formAction] = useActionState(respondToMessageRequest, {
    message: "",
  });
  const router = useRouter();

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
        No one’s trying to connect right now.
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
                  They’re open to talking about: {req.topic}
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

// Optimistic-aware submit button
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
