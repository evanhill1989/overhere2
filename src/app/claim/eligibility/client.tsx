"use client";

import { useRouter } from "next/navigation";
import { ClaimEligibilityScreen } from "@/components/ownership/ClaimEligibilityScreen";

export function ClaimEligibilityClient() {
  const router = useRouter();

  const handleAccept = () => {
    router.push("/claim/select-place");
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <ClaimEligibilityScreen
      onAccept={handleAccept}
      onCancel={handleCancel}
      eligibilityCheck={{ eligible: true }}
    />
  );
}
