"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, AlertCircle, CheckCircle2, Clock } from "lucide-react";

type PhoneVerificationFormProps = {
  claimId: string;
  phoneNumber: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
  attemptsRemaining?: number;
  codeSent?: boolean;
};

export function PhoneVerificationForm({
  claimId,
  phoneNumber,
  onVerify,
  onResend,
  onCancel,
  isLoading = false,
  error,
  attemptsRemaining = 3,
  codeSent = false,
}: PhoneVerificationFormProps) {
  const [code, setCode] = useState("");
  const [timeUntilResend, setTimeUntilResend] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (codeSent && timeUntilResend > 0) {
      const timer = setInterval(() => {
        setTimeUntilResend((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [codeSent, timeUntilResend]);

  const handleResend = () => {
    setTimeUntilResend(60);
    setCanResend(false);
    setCode("");
    onResend();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      onVerify(code);
    }
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length < 4) return phone;
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Verify Your Phone Number</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit code sent to {maskPhoneNumber(phoneNumber)}
        </p>
      </div>

      {codeSent && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Verification code sent! Check your phone for an SMS message.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {attemptsRemaining < 3 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {attemptsRemaining} verification attempt
            {attemptsRemaining !== 1 ? "s" : ""} remaining
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setCode(value);
              }}
              className="text-center font-mono text-2xl tracking-widest"
              autoFocus
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Enter the 6-digit code from your SMS message
          </p>
        </div>

        {/* Mock SMS Preview (for testing) */}
        <div className="bg-muted/50 space-y-2 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Smartphone className="h-4 w-4" />
            <span>SMS Preview (Testing Only)</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Since this is a mock implementation, any 6-digit code will work.
            <br />
            For production, enter the code from your SMS:{" "}
            <code className="bg-background rounded px-2 py-1">123456</code>
          </p>
        </div>

        {/* Resend Section */}
        <div className="bg-muted/30 flex items-center justify-between rounded-lg p-4">
          <div className="text-sm">
            {canResend ? (
              <span className="text-muted-foreground">
                Didn&apos;t receive a code?
              </span>
            ) : (
              <div className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Resend available in {timeUntilResend}s</span>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={!canResend || isLoading}
          >
            Resend Code
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={code.length !== 6 || isLoading}
            className="flex-1"
          >
            {isLoading ? "Verifying..." : "Verify & Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
