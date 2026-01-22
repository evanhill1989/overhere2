"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOwnershipRoute } from "@/app/_actions/ownershipRouting";
import { Building2, Loader2 } from "lucide-react";

type SmartOwnershipLinkProps = {
  variant?: "footer" | "place-detail";
  placeId?: string;
};

/**
 * Smart link that routes user to appropriate ownership page
 * based on their current ownership status
 */
export function SmartOwnershipLink({
  variant = "footer",
  placeId,
}: SmartOwnershipLinkProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await getOwnershipRoute(placeId);

      if (result.success) {
        router.push(result.route);
      } else {
        // Fallback to start page
        router.push("/claim/start");
      }
    } catch (error) {
      console.error("Error getting ownership route:", error);
      router.push("/claim/start");
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "footer") {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-sm transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
        <span>For Business Owners</span>
      </button>
    );
  }

  // Place detail variant - subtle link
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs underline-offset-4 transition-colors hover:underline disabled:opacity-50"
    >
      {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      <span>Are you the owner?</span>
    </button>
  );
}
