// app/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlaceFinderProvider } from "@/context/PlaceFinderProvider";
import PlaceFinderUI from "@/components/PlaceFinderUI";
import { useSession } from "@/components/SessionProvider";

export default function HomePage() {
  const userId = useSession(); // null if not logged in

  return (
    <div className="grid h-full max-w-3xl text-center md:max-w-full">
      {userId ? (
        <PlaceFinderProvider>
          <PlaceFinderUI />
        </PlaceFinderProvider>
      ) : (
        <div className="mx-auto mt-20 max-w-md space-y-6">
          <h1 className="text-3xl font-bold">Meet people, not profiles.</h1>
          <p className="text-muted-foreground text-lg">
            Overhere helps you connect spontaneously with people nearby.
          </p>
          <Link href="/auth/login">
            <Button className="w-full">Get Started</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
