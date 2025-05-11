// src/components/CheckInForm.tsx
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
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import type { LocationData } from "@/hooks/useGeolocation";
// Assuming you might use Sonner for notifications later
// import { toast } from "sonner";

const initialCheckinState: ActionResult = {
  success: false,
  message: "",
};

interface CheckInFormProps {
  place: Place; // The place selected for check-in

  currentUserLocation: LocationData | null; // Receive user location as prop
}

export function CheckInForm({
  place,

  currentUserLocation,
}: CheckInFormProps) {
  // Use useActionState for the check-in form submission
  const [state, formAction, isPending] = useActionState(
    submitCheckIn,
    initialCheckinState,
  );

  useEffect(() => {
    if (state?.message && !isPending) {
      console.log(
        `Check-in attempt: ${state.message} (Success: ${state.success})`,
      );
      // if (state.success) {
      //   toast.success(state.message);
      // } else {
      //   toast.error(state.message);
      // }
      // Note: submitCheckIn redirects on success, so success messages might not show long.
      // Consider removing the redirect if you want to show a success message here before navigating.
    }
  }, [state, isPending]);

  // Optional: Show toast messages
  useEffect(() => {
    /* ... */
  }, [state, isPending]);

  // Disable form submission if user location isn't available
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

        <div className="flex flex-col space-y-6">
          <div>
            <Label className="mb-2 block font-medium">Your Status:</Label>
            <RadioGroup
              name="status"
              defaultValue="available"
              className="flex gap-4"
              required
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="available" id="status-available" />
                <Label htmlFor="status-available" className="font-normal">
                  Available
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="busy" id="status-busy" />
                <Label htmlFor="status-busy" className="font-normal">
                  Busy
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="topicPreference" className="mb-1 block font-medium">
              Topic :
            </Label>
            <Input
              id="topicPreference"
              name="topicPreference"
              placeholder="e.g., 'Talking tech', 'Reading', 'Open to chat'"
              maxLength={120} // Match schema limit
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

          <Button
            className="self-end"
            type="submit"
            disabled={isPending || !canSubmit}
          >
            {isPending ? (
              <>
                {" "}
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking
                In...{" "}
              </>
            ) : (
              "Check In Here"
            )}
          </Button>

          {/* ... (Error message display) ... */}
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
