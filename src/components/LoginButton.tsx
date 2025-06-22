"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export function LoginButton() {
  const supabase = createClient();
  const handleLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return <Button onClick={handleLogin}>Log In</Button>;
}
