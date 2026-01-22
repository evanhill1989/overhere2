"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

type OwnershipEntryLinkProps = {
  variant?: "footer" | "place-detail";
  placeId?: string;
};

export function OwnershipEntryLink({
  variant = "footer",
  placeId,
}: OwnershipEntryLinkProps) {
  const router = useRouter();

  const handleClick = () => {
    // If on place detail page and placeId provided, pass it along
    if (variant === "place-detail" && placeId) {
      router.push(`/claim/start?placeId=${placeId}`);
    } else {
      router.push("/claim/start");
    }
  };

  if (variant === "footer") {
    return (
      <button
        onClick={handleClick}
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
      >
        <Building2 className="h-4 w-4" />
        <span>For Business Owners</span>
      </button>
    );
  }

  // Place detail variant - subtle link
  return (
    <button
      onClick={handleClick}
      className="text-muted-foreground hover:text-primary text-xs underline-offset-4 transition-colors hover:underline"
    >
      Are you the owner?
    </button>
  );
}
