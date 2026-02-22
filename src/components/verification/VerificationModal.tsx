"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Mail, Phone, Globe } from "lucide-react";
import type { PlaceVerificationDetails } from "@/lib/types/database";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: PlaceVerificationDetails;
  placeName: string;
};

export function VerificationModal({
  open,
  onOpenChange,
  details,
  placeName,
}: Props) {
  const { verifiedOwner, businessContact } = details;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Verified Business
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trust Section */}
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="font-medium text-blue-900">
              {placeName} has been verified by OverHere
            </p>
          </div>

          {/* What This Means */}
          <div className="space-y-2">
            <h3 className="font-semibold">What does this mean?</h3>
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li className="flex gap-2">
                <span>•</span>
                <span>Ownership has been confirmed</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Business contact information verified</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Authentic representation of this location</span>
              </li>
            </ul>
          </div>

          {/* Business Contact Info */}
          {businessContact && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Business Details</h3>

              {businessContact.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <a
                    href={`mailto:${businessContact.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {businessContact.email}
                  </a>
                </div>
              )}

              {businessContact.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <a
                    href={`tel:${businessContact.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {businessContact.phone}
                  </a>
                </div>
              )}

              {businessContact.website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="text-muted-foreground h-4 w-4" />
                  <a
                    href={businessContact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {businessContact.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Verification Date */}
          {verifiedOwner && (
            <div className="text-muted-foreground border-t pt-4 text-sm">
              <p>
                Verified:{" "}
                {new Date(verifiedOwner.verifiedAt).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
              <p>
                Role:{" "}
                {verifiedOwner.role.charAt(0).toUpperCase() +
                  verifiedOwner.role.slice(1)}
              </p>
            </div>
          )}

          {/* Privacy Note */}
          <div className="bg-muted text-muted-foreground rounded-lg p-3 text-xs">
            Contact information provided for customer inquiries. Please respect
            privacy.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
