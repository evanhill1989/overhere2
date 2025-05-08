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
    <div className="flex flex-col items-center  bg-background p-8 text-center">
      {isLoggedIn ? (
        <PlaceFinder />
      ) : (
        <>
          <h1 className="text-7xl font-bold text-primary mb-4 font-heading">
            Talk to people
          </h1>
          <p className="text-lg text-foreground mb-8 max-w-md">
            Discover people nearby looking for casual, platonic conversation.
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <LoginLink>Log In</LoginLink>
            </Button>
            <Button variant="secondary" asChild>
              <RegisterLink>Sign Up</RegisterLink>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
