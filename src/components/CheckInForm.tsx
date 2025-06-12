"use client";

import { useActionState, useEffect } from "react";
import {
  submitCheckIn,
  type ActionResult,
} from "@/app/_actions/checkinActions";
import type { Place } from "@/types/places";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import type { LocationData } from "@/hooks/useGeolocation";
import { DialogClose } from "@/components/ui/dialog";

const initialCheckinState: ActionResult = {
  success: false,
  message: "",
};

interface CheckInFormProps {
  place: Place;
  userLocation: LocationData | null;
  onCancel: () => void;
  onSuccessfulCheckin: () => void;
}

import { usePlaceFinder } from "@/context/PlaceFinderProvider"; // or wherever it's defined

export function CheckInForm({
  place,
  onCancel,
  onSuccessfulCheckin,
}: Omit<CheckInFormProps, "userLocation">) {
  const { userLocation } = usePlaceFinder();

  const [state, formAction, isPending] = useActionState(
    submitCheckIn,
    initialCheckinState,
  );

  useEffect(() => {
    if (state?.message && !isPending) {
      if (state.success) {
        onSuccessfulCheckin();
      }
    }
  }, [state, isPending, onSuccessfulCheckin]);

  const canSubmit = !!userLocation;

  return (
    <form action={formAction} className="space-y-6 pt-2">
      <input type="hidden" name="selectedPlaceId" value={place.place_id} />
      {userLocation && (
        <>
          <input
            type="hidden"
            name="userLatitude"
            value={userLocation.latitude}
          />
          <input
            type="hidden"
            name="userLongitude"
            value={userLocation.longitude}
          />
        </>
      )}
      <div>
        <Label className="mb-2 block text-sm font-medium">Your Status:</Label>
        <RadioGroup
          name="status"
          defaultValue="available"
          className="flex gap-4"
          required
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="available"
              id={`s-available-${place.place_id}`}
            />
            <Label
              htmlFor={`s-available-${place.place_id}`}
              className="text-sm font-normal"
            >
              Available
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="busy" id={`s-busy-${place.place_id}`} />
            <Label
              htmlFor={`s-busy-${place.place_id}`}
              className="text-sm font-normal"
            >
              Busy
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label
          htmlFor={`topic-${place.place_id}`}
          className="mb-1 block text-sm font-medium"
        >
          Topic (Optional):
        </Label>
        <Input
          id={`topic-${place.place_id}`}
          name="topicPreference"
          placeholder="e.g., 'Talking tech', 'Reading books'"
          maxLength={120}
          className="bg-background text-sm shadow-sm"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          What are you up for discussing?
        </p>
      </div>

      {!userLocation && (
        <p className="text-sm text-orange-600 dark:text-orange-400">
          Cannot check-in: Your current location is unavailable.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={isPending || !canSubmit}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking In...
            </>
          ) : (
            "Check In Here"
          )}
        </Button>
      </div>

      {state?.message && !state.success && !isPending && (
        <p className="mt-2 text-center text-sm font-semibold text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
