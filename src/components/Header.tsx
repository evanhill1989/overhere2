// components/Header.tsx

"use client";

import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { LoginButton } from "./LoginButton";
import { LogoutButton } from "./LogoutButton";
import LogoWithWave from "./LogoWithWave";

export function Header() {
  const session = useSession();
  const userId = session?.userId;

  const isLoggedIn = !!userId;

  return (
    <header className="z-5001 border-b border-gray-200 dark:border-gray-700">
      <div className="wrapper flex items-center justify-between py-3 md:py-4">
        <LogoWithWave />

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
            <li>{isLoggedIn ? <LogoutButton /> : <LoginButton />}</li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
