"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

type ClaimEligibilityScreenProps = {
  onAccept: () => void;
  onCancel: () => void;
  eligibilityCheck?: {
    eligible: boolean;
    reason?: string;
  };
};

export function ClaimEligibilityScreen({
  onAccept,
  onCancel,
  eligibilityCheck,
}: ClaimEligibilityScreenProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [understoodPenalties, setUnderstoodPenalties] = useState(false);

  const canContinue = agreedToTerms && understoodPenalties;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Business Owner Verification</h1>
        <p className="text-muted-foreground">
          Verify your ownership to access the business dashboard
        </p>
      </div>

      {/* Eligibility Check Result */}
      {eligibilityCheck && !eligibilityCheck.eligible && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{eligibilityCheck.reason}</AlertDescription>
        </Alert>
      )}

      {eligibilityCheck && eligibilityCheck.eligible && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            You are eligible to claim ownership of this location.
          </AlertDescription>
        </Alert>
      )}

      {/* Who This Is For */}
      <div className="bg-muted/50 space-y-4 rounded-lg p-6">
        <h2 className="text-xl font-semibold">Who Can Claim Ownership?</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <span>Business owners or authorized managers</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <span>Authorized representatives with proper documentation</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <span>Legal right to represent the business</span>
          </li>
        </ul>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Dashboard Access Includes:</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <div className="bg-primary mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
            <span>Customize location description and announcements</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="bg-primary mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
            <span>Create promotions and featured messages</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="bg-primary mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
            <span>Access analytics and engagement metrics</span>
          </li>
        </ul>
      </div>

      {/* Legal Warning */}
      <div className="border-destructive/50 space-y-4 rounded-lg border-2 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-destructive mt-0.5 h-6 w-6 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Important Legal Notice</h3>
            <p className="text-muted-foreground text-sm">
              Fraudulent ownership claims are taken seriously and may result in:
            </p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                <span>Immediate and permanent account termination</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                <span>Legal liability for false representation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                <span>
                  Reporting to authorities for malicious or repeated violations
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Agreement Checkboxes */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
          />
          <label
            htmlFor="terms"
            className="cursor-pointer text-sm leading-relaxed"
          >
            I certify that I am an owner, manager, or authorized representative
            of this business with the legal right to claim ownership on its
            behalf.
          </label>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="penalties"
            checked={understoodPenalties}
            onCheckedChange={(checked) =>
              setUnderstoodPenalties(checked === true)
            }
          />
          <label
            htmlFor="penalties"
            className="cursor-pointer text-sm leading-relaxed"
          >
            I understand that submitting a false claim will result in permanent
            account termination and may have legal consequences.
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onAccept} disabled={!canContinue} className="flex-1">
          Continue to Verification
        </Button>
      </div>
    </div>
  );
}
