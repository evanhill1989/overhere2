import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  getClaimById,
  getClaimAuditLog,
} from "@/app/_actions/ownershipQueries";
import { ClaimStatusClient } from "./client";

type PageProps = {
  params: Promise<{ claimId: string }>;
};

export default async function ClaimStatusPage({ params }: PageProps) {
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

  // Fetch audit log
  const auditLogResult = await getClaimAuditLog(claimId);
  const auditLog = auditLogResult.success ? auditLogResult.auditLog || [] : [];

  return (
    <ClaimStatusClient
      claim={{
        id: claim.id,
        placeName: claim.placeName || "",
        placeAddress: claim.placeAddress || "",
        status: claim.status,
        submittedAt: claim.submittedAt,
        verifiedAt: claim.verifiedAt,
        rejectionReason: claim.rejectionReason,
        fraudScore: claim.fraudScore,
      }}
      auditLog={auditLog}
      placeId={claim.placeId}
    />
  );
}
