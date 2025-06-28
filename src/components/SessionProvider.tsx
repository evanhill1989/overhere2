// components/SessionProvider.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

const SessionContext = createContext<{ userId: string | null } | null>(null);

export function SessionProvider({
  children,
  userId: initialUserId,
}: {
  children: React.ReactNode;
  userId: string | null;
}) {
  const [userId, setUserId] = useState<string | null>(initialUserId);

  useEffect(() => {
    const supabase = createClient();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setUserId(session?.user?.id ?? null);
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
