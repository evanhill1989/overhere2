"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoneVerificationForm } from "@/components/ownership/PhoneVerificationForm";
import {
  sendPhoneVerificationCode,
  verifyPhone,
  resendPhoneVerificationCode,
} from "@/app/_actions/ownershipActions";
import { toast } from "sonner";

type PhoneVerificationClientProps = {
  claimId: string;
  phoneNumber: string;
  verificationAttempts: number;
};

export function PhoneVerificationClient({
  claimId,
  phoneNumber,
  verificationAttempts: initialAttempts,
}: PhoneVerificationClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [codeSent, setCodeSent] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(
    3 - initialAttempts,
  );

  // Send initial verification code on mount
  useEffect(() => {
    const sendInitialCode = async () => {
      const result = await sendPhoneVerificationCode(claimId);
      if (result.success) {
        setCodeSent(true);
        toast.success("Verification code sent!");
      } else {
        setError(result.error || "Failed to send verification code");
      }
    };

    sendInitialCode();
  }, [claimId]);

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await verifyPhone({
        claimId,
        code,
      });

      if (!result.success) {
        setError(result.error || "Verification failed");
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }
        setIsLoading(false);
        return;
      }

      toast.success("Phone verified successfully!");
      router.push(`/claim/${claimId}/review`);
    } catch (error) {
      console.error("Error verifying phone:", error);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await resendPhoneVerificationCode(claimId);

      if (!result.success) {
        setError(result.error || "Failed to resend code");
        setIsLoading(false);
        return;
      }

      setCodeSent(true);
      toast.success("Verification code resent!");
      setIsLoading(false);
    } catch (error) {
      console.error("Error resending code:", error);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/claim/${claimId}/business-info`);
  };

  return (
    <PhoneVerificationForm
      claimId={claimId}
      phoneNumber={phoneNumber}
      onVerify={handleVerify}
      onResend={handleResend}
      onCancel={handleCancel}
      isLoading={isLoading}
      error={error}
      attemptsRemaining={attemptsRemaining}
      codeSent={codeSent}
    />
  );
}
