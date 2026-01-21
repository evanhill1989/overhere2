"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ClaimStatus = "pending" | "verified" | "rejected";

type AuditLogEntry = {
  id: string;
  action: string;
  actorName?: string | null;
  createdAt: string;
  metadata?: string | null;
};

type ClaimStatusTrackerProps = {
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
  auditLog?: AuditLogEntry[];
  onCancel?: () => void;
  onReturnHome?: () => void;
};

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Under Review",
    color: "bg-yellow-500",
    variant: "secondary" as const,
  },
  verified: {
    icon: CheckCircle2,
    label: "Verified",
    color: "bg-green-500",
    variant: "default" as const,
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "bg-destructive",
    variant: "destructive" as const,
  },
};

const actionLabels: Record<string, string> = {
  claim_started: "Claim Initiated",
  eligibility_accepted: "Eligibility Confirmed",
  business_info_submitted: "Business Info Provided",
  phone_code_sent: "Verification Code Sent",
  phone_code_verified: "Phone Verified",
  phone_code_failed: "Verification Failed",
  claim_submitted: "Claim Submitted for Review",
  claim_approved: "Claim Approved",
  claim_rejected: "Claim Rejected",
  claim_canceled: "Claim Canceled",
  admin_review_started: "Admin Review Started",
  admin_notes_added: "Admin Notes Added",
};

export function ClaimStatusTracker({
  claim,
  auditLog = [],
  onCancel,
  onReturnHome,
}: ClaimStatusTrackerProps) {
  const config = statusConfig[claim.status];
  const StatusIcon = config.icon;

  const canCancel = claim.status === "pending";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Status Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Ownership Claim Status</h1>
            <p className="text-muted-foreground">{claim.placeName}</p>
          </div>
          <Badge variant={config.variant} className="text-sm">
            {config.label}
          </Badge>
        </div>

        {/* Status Alert */}
        {claim.status === "pending" && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your claim is currently under review. Our team typically reviews
              claims within 1-3 business days. We&apos;ll notify you once a
              decision has been made.
            </AlertDescription>
          </Alert>
        )}

        {claim.status === "verified" && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              Congratulations! Your ownership claim has been approved. You now
              have access to the business dashboard.
            </AlertDescription>
          </Alert>
        )}

        {claim.status === "rejected" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Your claim was not approved.</p>
                {claim.rejectionReason && (
                  <p className="text-sm">Reason: {claim.rejectionReason}</p>
                )}
                <p className="text-sm">
                  If you believe this was an error, please contact support.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      {/* Claim Details */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Claim Details</h2>
        <div className="bg-muted/50 space-y-3 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Claim ID</span>
            <code className="bg-background rounded px-2 py-1 text-xs">
              {claim.id.slice(0, 8)}...
            </code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Submitted</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(claim.submittedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          {claim.verifiedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verified</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(claim.verifiedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Location</span>
            <span className="max-w-[60%] text-right font-medium">
              {claim.placeAddress}
            </span>
          </div>
        </div>
      </div>

      {/* Audit Log Timeline */}
      {auditLog.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Claim Timeline</h2>
            <div className="space-y-3">
              {auditLog.map((entry, index) => {
                const isLast = index === auditLog.length - 1;
                return (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-2 w-2 rounded-full ${config.color}`} />
                      {!isLast && (
                        <div className="bg-border h-full min-h-[40px] w-0.5" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {actionLabels[entry.action] || entry.action}
                          </p>
                          {entry.actorName && (
                            <p className="text-muted-foreground text-xs">
                              by {entry.actorName}
                            </p>
                          )}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(entry.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {canCancel && onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel Claim
          </Button>
        )}

        {claim.status === "verified" && (
          <Button onClick={onReturnHome} className="flex-1">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {claim.status === "rejected" && onReturnHome && (
          <Button variant="outline" onClick={onReturnHome} className="flex-1">
            Return Home
          </Button>
        )}

        {claim.status === "pending" && !canCancel && onReturnHome && (
          <Button variant="outline" onClick={onReturnHome} className="flex-1">
            Return Home
          </Button>
        )}
      </div>

      {/* Fraud Score (hidden from user, shown in admin view) */}
      {process.env.NODE_ENV === "development" &&
        claim.fraudScore !== undefined && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="text-xs">
                Debug: Fraud Score = {claim.fraudScore}/100 (only visible in
                development)
              </p>
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}
