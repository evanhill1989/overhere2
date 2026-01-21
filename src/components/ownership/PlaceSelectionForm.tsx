"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type CheckinOption = {
  id: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  createdAt: string;
};

type PlaceSelectionFormProps = {
  checkins: CheckinOption[];
  onSubmit: (checkinId: string, placeId: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function PlaceSelectionForm({
  checkins,
  onSubmit,
  onCancel,
  isLoading = false,
}: PlaceSelectionFormProps) {
  const [selectedCheckinId, setSelectedCheckinId] = useState<string>("");

  const handleSubmit = () => {
    const selectedCheckin = checkins.find((c) => c.id === selectedCheckinId);
    if (selectedCheckin) {
      onSubmit(selectedCheckin.id, selectedCheckin.placeId);
    }
  };

  if (checkins.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must have an active check-in at the location you want to claim.
            Please check in at your business location first.
          </AlertDescription>
        </Alert>
        <Button onClick={onCancel} variant="outline" className="w-full">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Select Your Business Location</h1>
        <p className="text-muted-foreground">
          Choose the location you want to claim from your recent check-ins
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You must be checked in at the location within the last 24 hours to
          claim ownership.
        </AlertDescription>
      </Alert>

      <RadioGroup
        value={selectedCheckinId}
        onValueChange={setSelectedCheckinId}
      >
        <div className="space-y-3">
          {checkins.map((checkin) => {
            const checkinAge = formatDistanceToNow(
              new Date(checkin.createdAt),
              {
                addSuffix: true,
              },
            );

            return (
              <div
                key={checkin.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                  selectedCheckinId === checkin.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedCheckinId(checkin.id)}
              >
                <RadioGroupItem value={checkin.id} id={checkin.id} />
                <div className="flex-1 space-y-2">
                  <Label htmlFor={checkin.id} className="cursor-pointer">
                    <div className="font-semibold">{checkin.placeName}</div>
                  </Label>
                  <div className="text-muted-foreground flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{checkin.placeAddress}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>Checked in {checkinAge}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </RadioGroup>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedCheckinId || isLoading}
          className="flex-1"
        >
          {isLoading ? "Processing..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
