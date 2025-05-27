"use client";

import { useActionState } from "react";
import {
  submitCheckIn,
  type ActionResult,
} from "@/app/_actions/checkinActions";
import type { Place } from "@/types/places";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react"; // X was removed as DialogClose will handle it
import { useEffect } from "react";
import type { LocationData } from "@/hooks/useGeolocation";
import { DialogClose } from "@/components/ui/dialog"; // For the cancel button

const initialCheckinState: ActionResult = {
  success: false,
  message: "",
};

interface CheckInFormProps {
  place: Place;
  currentUserLocation: LocationData | null;
  onCancel: () => void; // Add this prop
  onSuccessfulCheckin: () => void; // Add this prop
}

export function CheckInForm({
  place,
  currentUserLocation,
  onCancel, // Destructure the prop
  onSuccessfulCheckin, // Destructure the prop
}: CheckInFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitCheckIn,
    initialCheckinState,
  );

  useEffect(() => {
    if (state?.message && !isPending) {
      if (state.success) {
        onSuccessfulCheckin(); // Call if redirect doesn't happen first or for other cleanup
      }
    }
  }, [state, isPending, onSuccessfulCheckin]);

  const canSubmit = !!currentUserLocation;

  return (
    <div className="relative">
      <form action={formAction}>
        <input type="hidden" name="selectedPlaceId" value={place.id} />
        {currentUserLocation && (
          <>
            <input
              type="hidden"
              name="userLatitude"
              value={currentUserLocation.latitude}
            />
            <input
              type="hidden"
              name="userLongitude"
              value={currentUserLocation.longitude}
            />
          </>
        )}
        <div className="flex flex-col space-y-6 pt-2">
          <div>
            <Label className="mb-2 block font-medium">Your Status:</Label>
            <RadioGroup
              name="status"
              defaultValue="available"
              className="flex gap-4"
              required
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="available"
                  id={`status-available-${place.id}`}
                />
                <Label
                  htmlFor={`status-available-${place.id}`}
                  className="font-normal"
                >
                  Available
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="busy" id={`status-busy-${place.id}`} />
                <Label
                  htmlFor={`status-busy-${place.id}`}
                  className="font-normal"
                >
                  Busy
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label
              htmlFor={`topicPreference-${place.id}`}
              className="mb-1 block font-medium"
            >
              Topic (Optional):
            </Label>
            <Input
              id={`topicPreference-${place.id}`}
              name="topicPreference"
              placeholder="e.g., 'Talking tech', 'Reading', 'Open to chat'"
              maxLength={120}
              className="bg-background shadow-sm"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              What are you up for discussing?
            </p>
          </div>

          {!currentUserLocation && (
            <p className="text-sm text-orange-600">
              Cannot check-in: Your current location is unavailable.
            </p>
          )}

          <div className="flex flex-col space-y-2 sm:flex-row-reverse sm:gap-2 sm:space-y-0">
            <Button
              type="submit"
              disabled={isPending || !canSubmit}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking
                  In...
                </>
              ) : (
                "Check In Here"
              )}
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </DialogClose>
          </div>

          {state?.message && !state.success && !isPending && (
            <p className="mt-2 text-center text-lg font-semibold text-red-600">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
