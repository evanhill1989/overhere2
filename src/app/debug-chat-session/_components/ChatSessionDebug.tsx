// src/app/debug-chat-session/_components/ChatSessionDebug.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import type { SelectCheckin } from "@/db/oldSchema";
// Import your specific createClient utility that uses @supabase/ssr
import { createClient as createSupabaseBrowserClient } from "@/utils/supabase/client";
import type {
  SupabaseClient,
  User as SupabaseUser,
} from "@supabase/supabase-js";

interface ChatSessionDebugProps {
  placeId: string;
  currentUserKindeId: string | null;
}

export function ChatSessionDebug({
  placeId,
  currentUserKindeId,
}: ChatSessionDebugProps) {
  // Use useMemo to get the client instance once per component lifecycle
  const supabase = useMemo(() => {
    if (typeof window !== "undefined") {
      return createSupabaseBrowserClient();
    }
    return null;
  }, []);

  const [checkinsAtPlace, setCheckinsAtPlace] = useState<SelectCheckin[]>([]);
  const [myCheckin, setMyCheckin] = useState<SelectCheckin | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [clientAuthUserDisplay, setClientAuthUserDisplay] = useState<string>(
    "Checking Supabase auth status...",
  );

  useEffect(() => {
    if (!supabase) {
      setError("Supabase client not initialized for debug component.");
      setClientAuthUserDisplay("Supabase client init error.");
      return;
    }

    const fetchAuthAndData = async () => {
      setIsLoading(true);
      setError(null);
      setCheckinsAtPlace([]);
      setMyCheckin(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("ChatSessionDebug: Supabase Client Auth Session:", session);
      console.log("ChatSessionDebug: Supabase Client Auth User:", user);

      if (user) {
        setClientAuthUserDisplay(
          `ID: ${user.id}, Role: ${user.role}, Email: ${user.email}`,
        );
        if (user.id !== currentUserKindeId) {
          console.warn(
            `ChatSessionDebug: Mismatch! Supabase user.id (${user.id}) vs Kinde ID prop (${currentUserKindeId})`,
          );
        }
      } else {
        setClientAuthUserDisplay(
          "No active Supabase client session found by ChatSessionDebug.",
        );
        if (sessionError || userError) {
          console.error(
            "ChatSessionDebug: Error getting Supabase session/user:",
            sessionError || userError,
          );
        }
      }

      if (placeId) {
        const { data: placeCheckinsData, error: placeCheckinsError } =
          await supabase
            .from("checkins")
            .select("*")
            .eq("place_id", placeId)
            .order("created_at", { ascending: false });
        if (placeCheckinsError) {
          setError(
            (prev) =>
              `${prev || ""} Places fetch error: ${placeCheckinsError.message}`,
          );
        } else {
          setCheckinsAtPlace((placeCheckinsData as SelectCheckin[]) || []);
        }
      }

      if (currentUserKindeId && placeId) {
        const { data: myCheckinData, error: myCheckinError } = await supabase
          .from("checkins")
          .select("*")
          .eq("user_id", currentUserKindeId)
          .eq("place_id", placeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (myCheckinError && myCheckinError.code !== "PGRST116") {
          // Not necessarily a displayable error if no checkin found
        } else {
          setMyCheckin(myCheckinData as SelectCheckin | null);
        }
      }
      setIsLoading(false);
    };
    fetchAuthAndData();
  }, [placeId, currentUserKindeId, supabase]);

  // SessionDebug: Error getting Supabase session/user: AuthSessionMissingError: Auth session missing!

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border-2 border-dashed border-red-500 bg-red-50 p-4">
      <h3 className="mb-2 text-lg font-semibold text-red-700">
        RLS Debug Output (Checkins Table)
      </h3>
      <div className="my-2 rounded bg-white p-2 shadow">
        <h4 className="text-sm font-medium text-red-700">
          Supabase Client Auth Status:
        </h4>
        <pre className="text-xs break-all whitespace-pre-wrap">
          {clientAuthUserDisplay}
        </pre>
        <p className="mt-1 text-xs text-red-700">
          Expected Kinde ID for RLS:{" "}
          {currentUserKindeId || "N/A (Not logged in via Kinde?)"}
        </p>
      </div>
      {isLoading && <p className="text-red-600">Loading debug info...</p>}
      {error && <p className="font-bold text-red-700">Error: {error}</p>}
      <div className="mt-2">
        <h4 className="font-medium text-red-700">
          My Check-in Results (user_id: {currentUserKindeId || "N/A"}):
        </h4>
        {myCheckin ? (
          <pre className="overflow-x-auto rounded bg-white p-2 text-xs">
            {JSON.stringify(myCheckin, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-red-600 italic">
            No current check-in found for you via client query.
          </p>
        )}
      </div>
      <div className="mt-4">
        <h4 className="font-medium text-red-700">
          All Visible Check-ins at Place (place_id: {placeId}):
        </h4>
        {checkinsAtPlace.length > 0 ? (
          <pre className="max-h-60 overflow-y-auto rounded bg-white p-2 text-xs">
            {JSON.stringify(checkinsAtPlace, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-red-600 italic">
            No check-ins visible for this place via client query.
          </p>
        )}
        <p className="mt-1 text-xs text-red-700">
          Number of check-ins visible: {checkinsAtPlace.length}.
        </p>
      </div>
    </div>
  );
}
