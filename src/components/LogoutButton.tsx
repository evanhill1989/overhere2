"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export function LogoutButton() {
  const supabase = createClient();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return <Button onClick={handleLogout}>Log Out</Button>;
}
