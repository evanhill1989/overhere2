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
    // Consider if the main element needs specific height/width like h-screen
    // The PlaceFinder component itself defines its internal layout (e.g., flex col h-screen)
    <main>
      {isLoggedIn ? (
        <PlaceFinder /> // Delegate all place finding UI and logic here
      ) : (
        // Simple centered login prompt for non-authenticated users
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4 font-heading">
            Welcome to overhere
          </h1>
          <p className="text-lg text-foreground mb-8 max-w-md">
            Ready to break the ice and connect with people nearby in real life?
            Log in or sign up to get started.
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <LoginLink>Log In</LoginLink>
            </Button>
            <Button variant="secondary" asChild>
              <RegisterLink>Sign Up</RegisterLink>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
