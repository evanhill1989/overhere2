"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerificationBadge({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
    >
      <CheckCircle2 className="h-4 w-4" />
      Verified
    </Button>
  );
}
