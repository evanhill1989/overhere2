"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth error", error.message);
      }

      // Optionally, refresh server context via a hard reload
      window.location.href = "/";
    };

    handleAuth();
  }, [router]);

  return <p className="p-4">Completing login...</p>;
}
