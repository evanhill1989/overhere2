"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Supabase will automatically exchange code + verifier and set session
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.error("Auth error", error.message);
        return;
      }

      // Redirect now that session is available
      router.replace("/");
    });
  }, [router]);

  return <p className="p-4">Completing login...</p>;
}
