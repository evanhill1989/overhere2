"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClaimReviewScreen } from "@/components/ownership/ClaimReviewScreen";
import { submitClaim } from "@/app/_actions/ownershipActions";
import { toast } from "sonner";

type ClaimReviewClientProps = {
  claimId: string;
  claimData: {
    placeName: string;
    placeAddress: string;
    role: "owner" | "manager";
    businessEmail: string;
    phoneNumber: string;
    businessDescription: string;
    yearsAtLocation: string;
    verificationMethod: string;
  };
};

export function ClaimReviewClient({
  claimId,
  claimData,
}: ClaimReviewClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await submitClaim(claimId);

      if (!result.success) {
        setError(result.error || "Failed to submit claim");
        setIsLoading(false);
        return;
      }

      toast.success("Claim submitted for review!");
      router.push(`/claim/${claimId}/status`);
    } catch (error) {
      console.error("Error submitting claim:", error);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/claim/${claimId}/verify-phone`);
  };

  return (
    <ClaimReviewScreen
      claimData={claimData}
      onSubmit={handleSubmit}
      onBack={handleBack}
      isLoading={isLoading}
      error={error}
    />
  );
}
