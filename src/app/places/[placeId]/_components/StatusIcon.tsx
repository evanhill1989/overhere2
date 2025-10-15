// src/app/places/[placeId]/_components/StatusIcon.tsx
"use client";

import { Hand, MessageCircle } from "lucide-react";

export type IconType = "pulse" | "wave" | "message" | null;

export function StatusIcon({ type }: { type: IconType }) {
  switch (type) {
    case "pulse":
      return (
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
      );
    case "wave":
      return <Hand size={16} className="text-muted-foreground" />;
    case "message":
      return <MessageCircle size={16} className="mr-2" />;
    default:
      return null;
  }
}
