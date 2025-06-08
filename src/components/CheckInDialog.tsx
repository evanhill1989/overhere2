"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Place } from "@/types/places";
import { useTransition } from "react";
import { checkIn } from "@/app/_actions/checkIn";
import { usePlaceFinder } from "@/context/PlaceFinderProvider";

type CheckinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: Place;
};

export default function CheckinDialog({
  open,
  onOpenChange,
  place,
}: CheckinDialogProps) {
  const { userLocation } = usePlaceFinder();
  const [isPending, startTransition] = useTransition();

  const handleCheckin = () => {
    if (!userLocation) return;
    startTransition(() =>
      checkIn(
        place.place_id,
        place.name,
        place.address,
        userLocation.latitude,
        userLocation.longitude,
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check in to {place.name}?</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{place.address}</p>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleCheckin} disabled={isPending}>
            {isPending ? "Checking in..." : "Check In"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
