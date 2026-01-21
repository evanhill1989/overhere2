"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  User,
  Clock,
  ShieldCheck,
} from "lucide-react";

type ClaimReviewScreenProps = {
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
  onSubmit: () => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string;
};

const roleLabels = {
  owner: "Owner",
  manager: "Manager",
};

const yearsLabels: Record<string, string> = {
  less_than_1: "Less than 1 year",
  "1-2": "1-2 years",
  "3-5": "3-5 years",
  "5+": "More than 5 years",
};

export function ClaimReviewScreen({
  claimData,
  onSubmit,
  onBack,
  isLoading = false,
  error,
}: ClaimReviewScreenProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Review Your Claim</h1>
        <p className="text-muted-foreground">
          Please verify all information is correct before submitting
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Location Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Location Information</h2>
        <div className="bg-muted/50 space-y-3 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="font-medium">{claimData.placeName}</p>
              <p className="text-muted-foreground text-sm">
                {claimData.placeAddress}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Business Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Business Information</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <User className="text-muted-foreground mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Your Role</p>
              <p className="font-medium">{roleLabels[claimData.role]}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="text-muted-foreground mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Business Email</p>
              <p className="font-medium">{claimData.businessEmail}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="text-muted-foreground mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Phone Number</p>
              <p className="font-medium">{claimData.phoneNumber}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="text-muted-foreground mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Time at Location</p>
              <p className="font-medium">
                {yearsLabels[claimData.yearsAtLocation] ||
                  claimData.yearsAtLocation}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="text-muted-foreground mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Role Description</p>
              <p className="text-sm leading-relaxed font-medium">
                {claimData.businessDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Verification Status */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Verification Status</h2>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-green-600" />
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Verification Method</p>
            <div className="flex items-center gap-2">
              <p className="font-medium capitalize">
                {claimData.verificationMethod} Verification
              </p>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Final Warning */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Before You Submit:</p>
            <ul className="ml-4 space-y-1 text-sm">
              <li>• All information provided is accurate and truthful</li>
              <li>• You have legal authority to represent this business</li>
              <li>• Our team may contact you to verify these details</li>
              <li>• Review typically takes 1-3 business days</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
        >
          Back
        </Button>
        <Button onClick={onSubmit} disabled={isLoading} className="flex-1">
          {isLoading ? "Submitting..." : "Submit Claim for Review"}
        </Button>
      </div>
    </div>
  );
}
