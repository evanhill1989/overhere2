// src/app/page.tsx

import {
  getKindeServerSession,
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/server";

import { Button } from "@/components/ui/button";
import PlaceFinder from "@/components/PlaceFinder";

export default async function HomePage() {
  const { isAuthenticated } = getKindeServerSession();
  const isLoggedIn = await isAuthenticated();

  return (
    <div className="bg-background grid h-full grid-rows-[3fr_7fr] text-center">
      {isLoggedIn ? (
        <>
          <div></div> {/* Spacer row */}
          <PlaceFinder />
        </>
      ) : (
        <>
          <div></div> {/* Spacer row */}
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-primary font-heading text-3xl font-bold md:text-7xl">
              Talk to people
            </h1>
            <p className="text-foreground max-w-md md:text-lg">
              Discover people nearby looking for casual, platonic conversation.
            </p>
            <div className="mt-4 flex gap-4">
              <Button asChild>
                <LoginLink>Log In</LoginLink>
              </Button>
              <Button variant="secondary" asChild>
                <RegisterLink>Sign Up</RegisterLink>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
