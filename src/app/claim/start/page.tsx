import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserClaims } from "@/app/_actions/ownershipQueries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  Settings,
} from "lucide-react";

export default async function ClaimStartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/claim/start");
  }

  // Check for existing claims
  const claimsResult = await getUserClaims(user.id);

  if (claimsResult.success && claimsResult.claims) {
    const pendingClaim = claimsResult.claims.find(
      (c) => c.status === "pending",
    );
    const verifiedClaim = claimsResult.claims.find(
      (c) => c.status === "verified",
    );

    // If user has verified claim, redirect to dashboard
    if (verifiedClaim) {
      redirect(`/dashboard/places/${verifiedClaim.placeId}`);
    }

    // If user has pending claim, redirect to status page
    if (pendingClaim) {
      redirect(`/claim/${pendingClaim.id}/status`);
    }
  }

  return (
    <div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
      <div className="mx-auto max-w-4xl space-y-12 px-6 py-12">
        {/* Hero Section */}
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Business Owner Dashboard
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Take control of your business presence on OverHere. Verify your
            ownership to access powerful tools and insights.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card space-y-3 rounded-lg border p-6">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <BarChart3 className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Real-Time Analytics</h3>
            <p className="text-muted-foreground text-sm">
              Monitor check-ins, track engagement, and understand your customer
              activity in real-time.
            </p>
          </div>

          <div className="bg-card space-y-3 rounded-lg border p-6">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <MessageSquare className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Custom Messaging</h3>
            <p className="text-muted-foreground text-sm">
              Create announcements, promotions, and featured messages to engage
              with visitors.
            </p>
          </div>

          <div className="bg-card space-y-3 rounded-lg border p-6">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Settings className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Location Management</h3>
            <p className="text-muted-foreground text-sm">
              Update your business description, contact info, and location
              details.
            </p>
          </div>

          <div className="bg-card space-y-3 rounded-lg border p-6">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <ShieldCheck className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Verified Badge</h3>
            <p className="text-muted-foreground text-sm">
              Display a verified badge on your location to build trust with
              customers.
            </p>
          </div>
        </div>

        {/* Verification Process Overview */}
        <div className="bg-muted/50 space-y-6 rounded-lg p-8">
          <h2 className="text-center text-2xl font-semibold">
            Quick & Secure Verification Process
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2 text-center">
              <div className="bg-primary text-primary-foreground mx-auto flex h-10 w-10 items-center justify-center rounded-full font-bold">
                1
              </div>
              <p className="font-medium">Confirm Eligibility</p>
              <p className="text-muted-foreground text-sm">
                Review requirements and agree to terms
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="bg-primary text-primary-foreground mx-auto flex h-10 w-10 items-center justify-center rounded-full font-bold">
                2
              </div>
              <p className="font-medium">Business Details</p>
              <p className="text-muted-foreground text-sm">
                Provide your role and contact info
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="bg-primary text-primary-foreground mx-auto flex h-10 w-10 items-center justify-center rounded-full font-bold">
                3
              </div>
              <p className="font-medium">Phone Verification</p>
              <p className="text-muted-foreground text-sm">
                Verify via SMS code
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="bg-primary text-primary-foreground mx-auto flex h-10 w-10 items-center justify-center rounded-full font-bold">
                4
              </div>
              <p className="font-medium">Review & Submit</p>
              <p className="text-muted-foreground text-sm">
                Typically approved in 1-3 days
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4 text-center">
          <Link href="/claim/eligibility">
            <Button size="lg" className="px-8 text-lg">
              Start Verification
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-muted-foreground text-sm">
            Takes about 5 minutes to complete
          </p>
        </div>

        {/* Footer Note */}
        <div className="text-muted-foreground border-t pt-6 text-center text-sm">
          <p>
            This verification is for business owners and authorized managers
            only.
          </p>
          <p>False claims will result in account termination.</p>
        </div>
      </div>
    </div>
  );
}
