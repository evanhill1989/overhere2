"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlaceSelectionForm } from "@/components/ownership/PlaceSelectionForm";
import { startClaim } from "@/app/_actions/ownershipActions";
import { toast } from "sonner";

type CheckinOption = {
  id: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  createdAt: string;
};

type PlaceSelectionClientProps = {
  checkins: CheckinOption[];
};

export function PlaceSelectionClient({ checkins }: PlaceSelectionClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (checkinId: string, placeId: string) => {
    setIsLoading(true);

    try {
      const result = await startClaim({
        placeId,
        checkinId,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to start claim");
        setIsLoading(false);
        return;
      }

      toast.success("Claim started successfully!");
      router.push(`/claim/${result.claimId}/business-info`);
    } catch (error) {
      console.error("Error starting claim:", error);
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/claim/start");
  };

  return (
    <PlaceSelectionForm
      checkins={checkins}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  );
}
