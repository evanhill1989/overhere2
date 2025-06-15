"use client";

import Link from "next/link";
import { HandWaving } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";

export function Header() {
  const supabase = createClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(!!data.user);
    };
    checkUser();
  }, [supabase]);

  const handleLogin = async () => {
    supabase.auth.signInWithOAuth({
      provider: "google", // or other
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="z-5001 border-b border-gray-200 dark:border-gray-700">
      <div className="wrapper flex items-center justify-between py-3 md:py-4">
        <Link href="/" passHref legacyBehavior={false}>
          <div className="group flex items-center gap-2">
            <h1 className="font-heading active:underline active:underline-offset-2">
              overhere
            </h1>

            <div className="icon-wrapper group-hover:animate-wave-hover origin-[appropriate-for-wrapper]">
              <HandWaving className="animate-wave-load h-5 w-5 origin-[appropriate-for-icon]" />
            </div>
          </div>
        </Link>

        <nav>
          <ul className="flex items-center gap-4">
            <li>
              <Link
                href="/about"
                className="text-foreground/80 hover:text-primary hover:bg-primary/10 focus:ring-primary rounded px-3 py-1.5 text-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
              >
                About
              </Link>
            </li>
            <li>
              {isLoggedIn ? (
                <Button onClick={handleLogout}>Log Out</Button>
              ) : (
                <Button onClick={handleLogin}>Log In</Button>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
