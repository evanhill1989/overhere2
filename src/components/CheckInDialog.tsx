"use client";

import React, { useState } from "react";
import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckInForm } from "./CheckInForm";

interface CheckInDialogProps {
  place: Place;
  currentUserLocation: LocationData | null;
}

export function CheckInDialog({
  place,
  currentUserLocation,
}: CheckInDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="hover:bg-muted hover:border-border focus:ring-primary focus:border-primary flex w-full flex-col rounded border border-transparent p-2 text-left focus:ring-1 focus:outline-none"
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
                className="text-primary ml-2 inline-flex items-center gap-1"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p className="text-sm font-light">Verified Place</p>
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{place.address}</DialogDescription>
        </DialogHeader>
        <CheckInForm
          place={place}
          currentUserLocation={currentUserLocation}
          onCancel={handleClose}
          onSuccessfulCheckin={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
