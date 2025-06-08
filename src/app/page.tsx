// app/page.tsx
import { Button } from "@/components/ui/button";
import PlaceFinder from "@/components/PlaceFinder";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isLoggedIn = !!data.user;

  return (
    <div className="grid h-full max-w-3xl text-center md:max-w-full">
      {isLoggedIn ? (
        <PlaceFinder />
      ) : (
        <>
          <div></div> {/* Spacer row */}
          <div className="flex flex-col items-center gap-6 p-4 text-center">
            <h1 className="text-primary font-heading text-4xl font-bold md:text-7xl">
              Talk to people
            </h1>
            <p className="text-foreground max-w-md text-base/snug md:text-lg">
              Why not make it a little easier to break the ice and spark a
              genuine conversation?
            </p>
            <div className="mt-4 flex gap-4">
              <Button asChild>
                <Link href="/login">Join Overhere</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
