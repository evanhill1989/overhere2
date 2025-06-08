"use client";

import { useState, useEffect, useRef } from "react";
import type { SelectCheckin } from "@/db/oldSchema";
import {
  acceptChatSession,
  createOrGetChatSession,
  rejectChatSession,
} from "@/app/_actions/chatActions";
import MessageWindow from "./MessageWindow";
import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  transformCheckinRowToSelect,
  isValidChatSessionData,
  isValidCheckinData,
} from "@/lib/utils"; // Import guards
import { CssEphemeralText } from "@/components/animated/CssEphemeralText";
import { ChatSessionDebug } from "@/app/debug-chat-session/_components/ChatSessionDebug";

type ChatSessionRow = Tables<"chat_sessions">;
type CheckinRow = Tables<"checkins">;

interface InteractiveCheckinListProps {
  otherCheckins: SelectCheckin[];
  placeId: string;
  currentUserCheckinId: number | null;
  currentUserKindeId: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Failed to create Supabase client:", e);
  }
} else {
  console.error(
    "Supabase environment variables missing for client initialization.",
  );
}

export default function CheckinAndMessageController({
  otherCheckins,
  placeId,
  currentUserCheckinId,
  currentUserKindeId,
}: InteractiveCheckinListProps) {
  const [startFade, setStartFade] = useState(false);
  const someText = "These words will evaporate.";

  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
    null,
  );
  const [connectionPartnerCheckinId, setConnectionPartnerCheckinId] = useState<
    number | null
  >(null);
  const [isLoadingConnection, setIsLoadingConnection] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<ChatSessionRow[]>(
    [],
  );
  const [pendingOutgoingRequests, setPendingOutgoingRequests] = useState<
    Array<{ receiverCheckinId: number; sessionId: string }>
  >([]);
  const [displayedCheckins, setDisplayedCheckins] =
    useState<SelectCheckin[]>(otherCheckins);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setDisplayedCheckins(otherCheckins);
  }, [otherCheckins]);

  useEffect(() => {
    if (!supabase || !currentUserCheckinId || !placeId || !currentUserKindeId) {
      return;
    }

    let mounted = true;
    const channelName = `overhere_place_${placeId}_user_${currentUserKindeId}`;
    const currentChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserKindeId },
      },
    });
    channelRef.current = currentChannel;

    const incomingRequestHandler = (
      payload: RealtimePostgresChangesPayload<ChatSessionRow>,
    ) => {
      if (!mounted) return;
      if (
        payload.eventType === "INSERT" &&
        isValidChatSessionData(payload.new)
      ) {
        const newSession = payload.new;
        setIncomingRequests((prev) =>
          prev.find((req) => req.id === newSession.id)
            ? prev
            : [...prev, newSession],
        );
      } else if (payload.eventType === "INSERT") {
        console.warn("Malformed INSERT on chat_sessions:", payload.new);
      }
    };

    const outgoingSessionUpdateHandler = (
      payload: RealtimePostgresChangesPayload<ChatSessionRow>,
    ) => {
      if (!mounted) return;
      if (
        payload.eventType === "UPDATE" &&
        isValidChatSessionData(payload.new)
      ) {
        const updatedSession = payload.new;
        if (updatedSession.status === "active") {
          setActiveConnectionId(updatedSession.id);
          setConnectionPartnerCheckinId(updatedSession.receiver_checkin_id);
          setPendingOutgoingRequests((prev) =>
            prev.filter((req) => req.sessionId !== updatedSession.id),
          );
          setIncomingRequests((prev) =>
            prev.filter(
              (r) =>
                r.initiator_checkin_id !== updatedSession.receiver_checkin_id &&
                r.id !== updatedSession.id,
            ),
          );
        } else if (updatedSession.status === "rejected") {
          setPendingOutgoingRequests((prev) =>
            prev.filter((req) => req.sessionId !== updatedSession.id),
          );
          toast("Chat request dismissed by user.");
        }
      } else if (payload.eventType === "UPDATE") {
        console.warn("Malformed UPDATE on chat_sessions:", payload.new);
      }
    };

    const sessionDeleteHandler = (
      payload: RealtimePostgresChangesPayload<ChatSessionRow>,
    ) => {
      if (!mounted) return;
      const oldData = payload.old;
      if (
        payload.eventType === "DELETE" &&
        oldData &&
        typeof (oldData as Partial<ChatSessionRow>).id === "string"
      ) {
        const deletedSessionId = (oldData as ChatSessionRow).id;
        setIncomingRequests((prev) =>
          prev.filter((req) => req.id !== deletedSessionId),
        );
        setPendingOutgoingRequests((prev) =>
          prev.filter((req) => req.sessionId !== deletedSessionId),
        );
        if (activeConnectionId === deletedSessionId) {
          setActiveConnectionId(null);
          setConnectionPartnerCheckinId(null);
          toast.info("Chat session ended or was deleted.");
        }
      } else if (payload.eventType === "DELETE") {
        console.warn("Malformed DELETE on chat_sessions:", payload.old);
      }
    };

    const checkinInsertHandler = (
      payload: RealtimePostgresChangesPayload<CheckinRow>,
    ) => {
      if (!mounted) return;
      if (payload.eventType === "INSERT" && isValidCheckinData(payload.new)) {
        const newCheckin = payload.new;
        if (newCheckin.user_id !== currentUserKindeId) {
          const transformed = transformCheckinRowToSelect(newCheckin);
          if (transformed) {
            setDisplayedCheckins((prev) =>
              prev.find((c) => c.id === transformed.id)
                ? prev
                : [...prev, transformed].sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  ),
            );
          }
        }
      } else if (payload.eventType === "INSERT") {
        console.warn("Malformed INSERT on checkins:", payload.new);
      }
    };

    const checkinUpdateHandler = (
      payload: RealtimePostgresChangesPayload<CheckinRow>,
    ) => {
      if (!mounted) return;
      if (payload.eventType === "UPDATE" && isValidCheckinData(payload.new)) {
        const updatedCheckinData = payload.new;
        // Update if it's another user's check-in, or if it's the current user's check-in
        // and this component is responsible for displaying it (which it isn't directly, PlaceFinder is).
        // This logic primarily updates other users' checkins in the displayed list.
        if (updatedCheckinData.user_id !== currentUserKindeId) {
          const transformed = transformCheckinRowToSelect(updatedCheckinData);
          if (transformed) {
            setDisplayedCheckins((prev) =>
              prev
                .map((c) => (c.id === transformed.id ? transformed : c))
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                ),
            );
          }
        }
      } else if (payload.eventType === "UPDATE") {
        console.warn("Malformed UPDATE on checkins:", payload.new);
      }
    };

    const checkinDeleteHandler = (
      payload: RealtimePostgresChangesPayload<CheckinRow>,
    ) => {
      if (!mounted) return;
      const oldData = payload.old;
      // For DELETE, payload.old might only contain primary key.
      // We only need the ID to filter it out.
      if (
        payload.eventType === "DELETE" &&
        oldData &&
        typeof (oldData as Partial<CheckinRow>).id === "number"
      ) {
        const deletedCheckinId = (oldData as Partial<CheckinRow>).id;
        setDisplayedCheckins((prev) =>
          prev.filter((c) => c.id !== deletedCheckinId),
        );
      } else if (payload.eventType === "DELETE") {
        console.warn("Malformed DELETE on checkins:", payload.old);
      }
    };

    currentChannel.on<ChatSessionRow>(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_sessions",
        filter: `receiver_checkin_id=eq.${currentUserCheckinId}`,
      },
      incomingRequestHandler,
    );
    currentChannel.on<ChatSessionRow>(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_sessions",
        filter: `initiator_checkin_id=eq.${currentUserCheckinId}`,
      },
      outgoingSessionUpdateHandler,
    );
    currentChannel.on<ChatSessionRow>(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "chat_sessions" },
      sessionDeleteHandler,
    );

    currentChannel.on<CheckinRow>(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "checkins",
        filter: `place_id=eq.${placeId}`,
      },
      checkinInsertHandler,
    );
    currentChannel.on<CheckinRow>(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "checkins",
        filter: `place_id=eq.${placeId}`,
      },
      checkinUpdateHandler,
    );
    currentChannel.on<CheckinRow>(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "checkins",
        filter: `place_id=eq.${placeId}`,
      },
      checkinDeleteHandler,
    );

    currentChannel.subscribe((status, err) => {
      if (!mounted) return;
      if (status === "SUBSCRIBED") {
        console.log(`Successfully subscribed to channel ${channelName}`);
      } else if (err) {
        console.error(`Subscription error on ${channelName}:`, err);
        setErrorMessage("Realtime connection issue. Features may be delayed.");
      } else {
        console.log(`Subscription status on ${channelName}: ${status}`);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setErrorMessage(
            "Realtime connection issue. Features may be delayed.",
          );
        }
      }
    });

    return () => {
      mounted = false;
      if (currentChannel && supabase) {
        supabase
          .removeChannel(currentChannel)
          .catch((err) =>
            console.error(`Error removing channel ${channelName}:`, err),
          );
      }
      channelRef.current = null;
    };
  }, [currentUserCheckinId, currentUserKindeId, placeId, activeConnectionId]);

  // In CheckinAndMessageController.tsx

  const handleInitiateConnection = async (receiverCheckin: SelectCheckin) => {
    if (!currentUserCheckinId || isLoadingConnection) return;

    setIsLoadingConnection(true);
    setErrorMessage(null);

    const result = await createOrGetChatSession(
      currentUserCheckinId,
      receiverCheckin.id,
      placeId,
    );

    if (result.error || !result.sessionId) {
      setErrorMessage(result.error || "Could not start chat request.");
      setTimeout(() => setErrorMessage(null), 3500);
    } else {
      setErrorMessage(null); // Clear any previous error on success

      // Check if details of an existing session were returned
      if (result.existingStatus) {
        if (
          result.existingStatus === "pending" &&
          result.existingInitiatorId === currentUserCheckinId &&
          result.existingReceiverId === receiverCheckin.id
        ) {
          toast.info("You already have a pending request with this user.");
          // Optionally ensure it's in pendingOutgoingRequests if not already
          setPendingOutgoingRequests((prev) =>
            prev.find((req) => req.sessionId === result.sessionId)
              ? prev
              : [
                  ...prev,
                  {
                    receiverCheckinId: receiverCheckin.id,
                    sessionId: result.sessionId!,
                  },
                ],
          );
        } else if (
          result.existingStatus === "pending" &&
          result.existingReceiverId === currentUserCheckinId &&
          result.existingInitiatorId === receiverCheckin.id
        ) {
          toast.info(
            "This user has already sent you a request! Check your incoming requests.",
            {
              action: {
                label: "View",
                onClick: () => {
                  /* placeholder for scroll/highlight logic */
                },
              },
            },
          );
          // This request should appear in incomingRequests via Realtime subscription
        } else if (result.existingStatus === "active") {
          toast.info("You already have an active chat with this user.");
          setActiveConnectionId(result.sessionId);
          // Ensure existingInitiatorId and existingReceiverId are defined before using
          if (
            typeof result.existingInitiatorId === "number" &&
            typeof result.existingReceiverId === "number"
          ) {
            setConnectionPartnerCheckinId(
              result.existingInitiatorId === currentUserCheckinId
                ? result.existingReceiverId
                : result.existingInitiatorId,
            );
          }
        } else if (
          result.existingStatus === "rejected" &&
          result.existingInitiatorId === currentUserCheckinId &&
          result.existingReceiverId === receiverCheckin.id
        ) {
          toast.warning("This user previously dismissed your chat request.");
        } else {
          // New session was created, or existing session was in another state not handled above.
          // If a new session was created by the action, existingStatus would be undefined.
          // Add to pendingOutgoingRequests.
          setPendingOutgoingRequests((prev) => {
            if (!prev.find((req) => req.sessionId === result.sessionId)) {
              return [
                ...prev,
                {
                  receiverCheckinId: receiverCheckin.id,
                  sessionId: result.sessionId!,
                },
              ];
            }
            return prev;
          });
        }
      } else {
        // No existingStatus means a brand new session was created and is pending.
        setPendingOutgoingRequests((prev) => {
          if (!prev.find((req) => req.sessionId === result.sessionId)) {
            return [
              ...prev,
              {
                receiverCheckinId: receiverCheckin.id,
                sessionId: result.sessionId!,
              },
            ];
          }
          return prev;
        });
      }

      // When initiating, clear any incoming requests *from* this specific partner,
      // as our outgoing request should now take precedence or be the active one.
      setIncomingRequests((prev) =>
        prev.filter((r) => r.initiator_checkin_id !== receiverCheckin.id),
      );
    }
    setIsLoadingConnection(false);
  };

  const handleAcceptConnection = async (request: ChatSessionRow) => {
    if (isLoadingConnection) return;
    setIsLoadingConnection(true);
    setErrorMessage(null);
    try {
      const result = await acceptChatSession(request.id);
      if (result.success) {
        setActiveConnectionId(request.id);
        setConnectionPartnerCheckinId(request.initiator_checkin_id);
        setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
        toast.success("Chat request accepted!");
      } else {
        setErrorMessage(result.error || "Could not accept chat.");
        toast.error(result.error || "Could not accept chat.");
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred.");
      toast.error("An unexpected error occurred.");
      console.error(error);
    } finally {
      setIsLoadingConnection(false);
    }
  };

  const handleDismissRequest = async (request: ChatSessionRow) => {
    if (isLoadingConnection) return;
    setIsLoadingConnection(true);
    setErrorMessage(null);
    try {
      const result = await rejectChatSession(request.id); // Server action to set status to 'rejected'
      if (result.success) {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
        toast.info("Chat request dismissed.");
      } else {
        setErrorMessage(result.error || "Could not dismiss request.");
        toast.error(result.error || "Could not dismiss request.");
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred.");
      toast.error("An unexpected error occurred.");
      console.error(error);
    } finally {
      setIsLoadingConnection(false);
    }
  };

  if (
    activeConnectionId &&
    connectionPartnerCheckinId &&
    currentUserCheckinId
  ) {
    return (
      <MessageWindow
        sessionId={activeConnectionId}
        currentUserCheckinId={currentUserCheckinId}
        partnerCheckinId={connectionPartnerCheckinId}
        onClose={() => {
          setActiveConnectionId(null);
          setConnectionPartnerCheckinId(null);
          // Optionally call a server action here to set chat_session status to 'closed'
          toast.info("Chat closed.");
        }}
      />
    );
  }

  return (
    <section className="mt-6 space-y-5">
      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {incomingRequests.length > 0 && (
        <div className="my-4 rounded-md border border-yellow-300 bg-yellow-100 p-3 shadow dark:border-yellow-700 dark:bg-yellow-900/30">
          <h3 className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            New Chat Request{incomingRequests.length > 1 ? "s" : ""}!
          </h3>
          <ul className="space-y-2">
            {incomingRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between rounded bg-yellow-50 p-2 text-sm dark:bg-yellow-800/30"
              >
                <span className="text-yellow-900 dark:text-yellow-100">
                  Connection request from someone nearby.
                </span>
                <div className="flex gap-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcceptConnection(request)}
                    disabled={isLoadingConnection}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissRequest(request)}
                    disabled={isLoadingConnection}
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xl font-semibold dark:text-white">
          Checked In Nearby
        </h2>
        {displayedCheckins.length === 0 &&
          incomingRequests.length === 0 &&
          !errorMessage && (
            <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-700">
              <p className="text-gray-600 italic dark:text-gray-400">
                No one else is checked in right now.
              </p>
            </div>
          )}
        {displayedCheckins.length > 0 && (
          <ul className="space-y-3">
            {displayedCheckins.map((checkin) => {
              const isPendingOutgoing = pendingOutgoingRequests.some(
                (req) => req.receiverCheckinId === checkin.id,
              );
              const isThisAnIncomingRequest = incomingRequests.find(
                (req) => req.initiator_checkin_id === checkin.id,
              );

              return (
                <li
                  key={checkin.id}
                  className={`flex items-center justify-between rounded-md border bg-white p-3 transition-opacity dark:border-gray-700 dark:bg-gray-800 ${isLoadingConnection && !isPendingOutgoing && !isThisAnIncomingRequest ? "pointer-events-none opacity-50" : ""}`}
                >
                  <div>
                    <span
                      className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${checkin.status === "available" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"}`}
                    >
                      {checkin.status === "available" ? "Available" : "Busy"}
                    </span>
                    {checkin.topic ? (
                      <span className="text-gray-800 italic dark:text-gray-200">
                        "{checkin.topic}"
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Open to connect
                      </span>
                    )}
                  </div>
                  <div className="flex gap-x-2">
                    {isThisAnIncomingRequest && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleAcceptConnection(isThisAnIncomingRequest)
                        }
                        disabled={isLoadingConnection}
                      >
                        Accept Request
                      </Button>
                    )}
                    {!isThisAnIncomingRequest && isPendingOutgoing && (
                      <Button
                        disabled={true}
                        variant="secondary"
                        size="sm"
                        className="cursor-default"
                      >
                        Request Pending
                      </Button>
                    )}
                    {!isThisAnIncomingRequest &&
                      !isPendingOutgoing &&
                      checkin.status === "available" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleInitiateConnection(checkin)}
                          disabled={
                            isLoadingConnection || !currentUserCheckinId
                          }
                          title={
                            !currentUserCheckinId
                              ? "Check in to connect"
                              : "Send connection request"
                          }
                        >
                          {isLoadingConnection ? "Sending..." : "Connect"}
                        </Button>
                      )}
                    {!isThisAnIncomingRequest &&
                      !isPendingOutgoing &&
                      checkin.status === "busy" && (
                        <span className="px-3 py-1 text-sm text-gray-500 italic dark:text-gray-400">
                          Busy
                        </span>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {currentUserCheckinId && (
        <ChatSessionDebug
          placeId={placeId}
          currentUserKindeId={currentUserKindeId}
        />
      )}
      <div className="mt-8 border-t pt-6 dark:border-gray-700">
        <h3 className="mb-2 text-lg font-semibold dark:text-white">
          Animation Test
        </h3>
        <Button onClick={() => setStartFade(true)}>Evaporate Text</Button>
        <Button
          onClick={() => setStartFade(false)}
          className="ml-2"
          variant="outline"
        >
          Reset
        </Button>
        <div className="my-4">
          <CssEphemeralText
            text={someText}
            animateOut={startFade}
            staggerDelay={0.07}
            charAnimationDuration={0.6}
            className="text-foreground text-2xl"
            tag="h2"
          />
        </div>
        {!startFade && (
          <p className="text-muted-foreground text-sm">
            Text is reset. Click Evaporate Text to see the animation.
          </p>
        )}
      </div>
    </section>
  );
}
