// src/components/CheckInDialog.tsx
"use client";

import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation"; // Assuming this type exists

import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckInForm } from "./CheckInForm"; // Assuming CheckInForm is in components folder

interface CheckInDialogProps {
  place: Place;
  currentUserLocation: LocationData | null;
}

export function CheckInDialog({
  place,
  currentUserLocation,
}: CheckInDialogProps) {
  // No local state needed here for dialog open/close if using uncontrolled DialogTrigger

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="hover:bg-muted hover:border-border focus:ring-primary focus:border-primary w-full rounded border border-transparent p-2 text-left focus:ring-1 focus:outline-none"
          aria-label={`Check in at ${place.name}`}
        >
          <div className="flex items-center gap-1">
            <span className="font-medium">{place.name}</span>
            {place.isVerified && (
              <span title="Verified by overHere">
                <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
              </span>
            )}
          </div>
          <br />
          <span className="text-muted-foreground text-xs">{place.address}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Check in at: {place.name}
            {place.isVerified && (
              <span
                title="Verified by overHere"
                className="text-primary flex items-center gap-1"
              >
                <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                <p className="text-sm font-light font-stretch-semi-condensed">
                  Verified Place by overhere
                </p>
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{place.address}</DialogDescription>
        </DialogHeader>
        <CheckInForm
          place={place}
          currentUserLocation={currentUserLocation}
          // The onCancel for CheckInForm will now primarily be handled by
          // its internal <DialogClose> button. If PlaceFinder needed to know
          // about the cancel, we'd pass a callback here. For now, it's simpler.
        />
      </DialogContent>
    </Dialog>
  );
}
