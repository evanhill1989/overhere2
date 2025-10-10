// components/SessionProvider.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { type UserId, userIdSchema } from "@/lib/types/database";

const SessionContext = createContext<{ userId: UserId | null } | null>(null);

export function SessionProvider({
  children,
  userId: initialUserId,
}: {
  children: React.ReactNode;
  userId: UserId | null;
}) {
  const [userId, setUserId] = useState<UserId | null>(initialUserId);

  useEffect(() => {
    const supabase = createClient();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const rawId = session?.user?.id ?? null;

          // 4. Validate and Brand the ID on change
          // Parse the raw string ID from Supabase to ensure it is a valid UserId
          try {
            const brandedId = rawId ? userIdSchema.parse(rawId) : null;
            setUserId(brandedId);
          } catch (e) {
            console.error(
              "Failed to brand Supabase user ID on auth change:",
              e,
            );
            setUserId(null); // Fallback to null if parsing fails
          }
        }
        if (event === "SIGNED_OUT") {
          setUserId(null);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ userId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
