"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BusinessInfoForm } from "@/components/ownership/BusinessInfoForm";
import { submitBusinessInfo } from "@/app/_actions/ownershipActions";
import { toast } from "sonner";

type BusinessInfoClientProps = {
  claimId: string;
  placeName: string;
};

export function BusinessInfoClient({
  claimId,
  placeName,
}: BusinessInfoClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (data: {
    claimId: string;
    role: "owner" | "manager";
    businessEmail: string;
    businessDescription: string;
    yearsAtLocation: string;
    phoneNumber: string;
  }) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await submitBusinessInfo(data);

      if (!result.success) {
        setError(result.error || "Failed to submit business info");
        setIsLoading(false);
        return;
      }

      toast.success("Business information saved!");
      router.push(`/claim/${claimId}/verify-phone`);
    } catch (error) {
      console.error("Error submitting business info:", error);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/claim/start");
  };

  return (
    <BusinessInfoForm
      claimId={claimId}
      placeName={placeName}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
      error={error}
    />
  );
}
