"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClaimStatusTracker } from "@/components/ownership/ClaimStatusTracker";
import { cancelClaim } from "@/app/_actions/ownershipActions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ClaimStatus = "pending" | "verified" | "rejected";

type AuditLogEntry = {
  id: string;
  action: string;
  actorName?: string | null;
  createdAt: string;
  metadata?: string | null;
};

type ClaimStatusClientProps = {
  claim: {
    id: string;
    placeName: string;
    placeAddress: string;
    status: ClaimStatus;
    submittedAt: string;
    verifiedAt?: string | null;
    rejectionReason?: string | null;
    fraudScore?: number;
  };
  auditLog: AuditLogEntry[];
  placeId: string;
};

export function ClaimStatusClient({
  claim,
  auditLog,
  placeId,
}: ClaimStatusClientProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    setIsCanceling(true);

    try {
      const result = await cancelClaim({ claimId: claim.id });

      if (!result.success) {
        toast.error(result.error || "Failed to cancel claim");
        setIsCanceling(false);
        setShowCancelDialog(false);
        return;
      }

      toast.success("Claim canceled");
      router.push("/claim/start");
    } catch (error) {
      console.error("Error canceling claim:", error);
      toast.error("An unexpected error occurred");
      setIsCanceling(false);
      setShowCancelDialog(false);
    }
  };

  const handleReturnHome = () => {
    if (claim.status === "verified") {
      router.push(`/dashboard/places/${placeId}`);
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <ClaimStatusTracker
        claim={claim}
        auditLog={auditLog}
        onCancel={claim.status === "pending" ? handleCancel : undefined}
        onReturnHome={handleReturnHome}
      />

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Ownership Claim?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this claim? This action cannot be
              undone. You&apos;ll need to start the verification process over if
              you want to claim this location again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Keep Claim
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCanceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? "Canceling..." : "Cancel Claim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
