"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();
      const code = searchParams.get("code");

      if (!code) {
        console.error("No code found in URL");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth exchange error:", error.message);
        return;
      }

      window.location.href = "/";
    };

    handleAuth();
  }, [router, searchParams]);

  return <p className="p-4">Completing login...</p>;
}
