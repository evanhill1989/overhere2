"use client";

import { PlaceFinderProvider } from "@/providers/PlaceFinderProvider";
import PlaceFinderUI from "@/components/PlaceFinderUI";
import { useSession } from "@/components/SessionProvider";
import { LoginButton } from "@/components/LoginButton";

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
          not&nbsp;usernames.
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Spontaneous conversation with people where you are — no profiles, no
          pressure.
        </p>

        <LoginButton size="lg" className="w-full text-lg">
          Say hello
        </LoginButton>
      </div>
    </div>
  );
}
