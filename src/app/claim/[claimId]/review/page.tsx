import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getClaimById } from "@/app/_actions/ownershipQueries";
import { ClaimReviewClient } from "./client";

type PageProps = {
  params: Promise<{ claimId: string }>;
};

export default async function ClaimReviewPage({ params }: PageProps) {
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

  // Verify all required steps completed
  if (
    !claim.businessEmail ||
    !claim.phoneNumber ||
    !claim.businessDescription
  ) {
    redirect(`/claim/${claimId}/business-info`);
  }

  return (
    <ClaimReviewClient
      claimId={claimId}
      claimData={{
        placeName: claim.placeName || "",
        placeAddress: claim.placeAddress || "",
        role: claim.role,
        businessEmail: claim.businessEmail,
        phoneNumber: claim.phoneNumber,
        businessDescription: claim.businessDescription,
        yearsAtLocation: claim.yearsAtLocation || "",
        verificationMethod: claim.verificationMethod,
      }}
    />
  );
}
