"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import type { ComponentProps, ReactNode } from "react";

interface LoginButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick"> {
  children?: ReactNode;
}

export function LoginButton({ children, ...props }: LoginButtonProps) {
  const supabase = createClient();
  const handleLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <Button onClick={handleLogin} {...props}>
      {children || "Log In"}
    </Button>
  );
}
