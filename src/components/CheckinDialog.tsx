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
import { checkIn } from "@/app/_actions/checkinActions";
import { usePlaceFinder } from "@/context/PlaceFinderProvider";

type CheckinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: Place;
};

console.log("Test");

export default function CheckinDialog({
  open,
  onOpenChange,
  place,
}: CheckinDialogProps) {
  const { userLocation } = usePlaceFinder();
  const [isPending, startTransition] = useTransition();

  const handleCheckin = () => {
    if (!userLocation) return;

    const formData = new FormData();
    formData.append("placeId", place.place_id);
    formData.append("placeName", place.name);
    formData.append("placeAddress", place.address);
    formData.append("latitude", userLocation.latitude.toString());
    formData.append("longitude", userLocation.longitude.toString());

    startTransition(() => checkIn(formData));
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
