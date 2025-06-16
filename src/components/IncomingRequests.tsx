"use client";

import { useFormState, useFormStatus } from "react-dom";
import { respondToMessageRequest } from "@/app/_actions/messageActions";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePollMessageRequests } from "@/hooks/usePollMessageRequests";

type RequestStatus = "pending" | "accepted" | "rejected" | "canceled";

export function IncomingRequests({
  currentUserId,
  placeId,
}: {
  currentUserId: string;
  placeId: string;
}) {
  const { requests, isLoading } = usePollMessageRequests(currentUserId);
  const filtered = requests.filter((r) => r.placeId === placeId);

  const initialState = { message: "" };
  const [state, formAction] = useFormState(
    respondToMessageRequest,
    initialState,
  );

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
      {filtered.length === 0 ? (
        <li className="text-muted-foreground">
          No one’s trying to connect right now.
        </li>
      ) : (
        filtered.map((req) => {
          const isInitiator = req.initiatorId === currentUserId;
          const status: RequestStatus = req.status;

          return (
            <li key={req.id} className="rounded-md border p-4">
              <p className="text-sm font-medium">
                {isInitiator
                  ? "You sent a wave."
                  : "Someone nearby is open to saying hi."}
              </p>
              <p className="text-muted-foreground text-sm capitalize">
                Status: {status}
              </p>

              {status === "pending" && (
                <form action={formAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="requestId" value={req.id} />
                  {isInitiator ? (
                    <>
                      <input type="hidden" name="response" value="canceled" />
                      <SubmitButton label="Changed your mind?" />
                    </>
                  ) : (
                    <>
                      <SubmitButton
                        name="response"
                        value="accepted"
                        label="Sure"
                      />
                      <SubmitButton
                        name="response"
                        value="rejected"
                        label="Not now"
                      />
                    </>
                  )}
                </form>
              )}

              {state.message && (
                <p className="text-muted-foreground mt-2 text-xs italic">
                  {state.message}
                </p>
              )}
            </li>
          );
        })
      )}
    </ul>
  );
}

// Reusable button with pending state
function SubmitButton({
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
