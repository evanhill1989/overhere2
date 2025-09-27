"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlaceFinderProvider } from "@/providers/PlaceFinderProvider";
import PlaceFinderUI from "@/components/PlaceFinderUI";
import { useSession } from "@/components/SessionProvider";

export default function HomePage() {
  const session = useSession();
  const userId = session?.userId;

  return userId ? (
    <PlaceFinderProvider>
      <PlaceFinderUI />
    </PlaceFinderProvider>
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Meet people,
          <br />
          not&nbsp;profiles.
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Overhere helps you connect spontaneously with people nearby — no
          profiles, no pressure.
        </p>
        <Link href="/auth/login">
          <Button size="lg" className="w-full text-lg">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
}
