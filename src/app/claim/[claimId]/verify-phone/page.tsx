import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getClaimById } from "@/app/_actions/ownershipQueries";
import { PhoneVerificationClient } from "./client";

type PageProps = {
  params: Promise<{ claimId: string }>;
};

export default async function VerifyPhonePage({ params }: PageProps) {
  const { claimId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch claim details
  const claimResult = await getClaimById(claimId);

  if (!claimResult.success || !claimResult.claim) {
    redirect("/claim/start");
  }

  const claim = claimResult.claim;

  // Verify claim belongs to user
  if (claim.userId !== user.id) {
    redirect("/claim/start");
  }

  // Verify claim is still pending
  if (claim.status !== "pending") {
    redirect(`/claim/${claimId}/status`);
  }

  // Verify business info was submitted
  if (!claim.phoneNumber) {
    redirect(`/claim/${claimId}/business-info`);
  }

  return (
    <PhoneVerificationClient
      claimId={claimId}
      phoneNumber={claim.phoneNumber}
      verificationAttempts={claim.verificationCodeAttempts || 0}
    />
  );
}
