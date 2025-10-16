"use client";

import { usePlaceFinder } from "@/providers/PlaceFinderProvider";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { checkIn } from "@/app/_actions/checkinActions";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types/database";

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: Place;
}

export default function CheckinDialog({
  open,
  onOpenChange,
  place,
}: CheckinDialogProps) {
  const { userLocation } = usePlaceFinder();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [checkinStatus, setCheckinStatus] = useState<"available" | "busy">(
    "available",
  );

  const handleCheckin = () => {
    if (!userLocation) return;

    const formData = new FormData();
    formData.append("placeId", place.id);
    formData.append("placeName", place.name);
    formData.append("placeAddress", place.address);
    formData.append("latitude", userLocation.latitude.toString());
    formData.append("longitude", userLocation.longitude.toString());
    formData.append("topic", topic);
    formData.append("checkinStatus", checkinStatus);

    startTransition(async () => {
      try {
        await checkIn(formData);

        console.log(
          "✅ Check-in completed, waiting for database consistency...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay

        console.log("🚀 Navigating to place page...");
        router.push(`/places/${place.id}`);

        router.push(`/places/${place.id}`);
      } catch (error) {
        console.error("Check-in failed:", error);
        // TODO: Show error toast
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check in to {place.name}?</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">{place.address}</p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="topic" className="mb-2"></Label>
            <Input
              id="topic"
              placeholder="Topic preferences"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div>
            <RadioGroup
              value={checkinStatus}
              onValueChange={(val: "available" | "busy") =>
                setCheckinStatus(val)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="available" id="available" />
                <Label htmlFor="available">Available to chat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="busy" id="busy" />
                <Label htmlFor="busy">I'll get back to you</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCheckin} disabled={isPending}>
              {isPending ? "Checking in..." : "Check In"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
