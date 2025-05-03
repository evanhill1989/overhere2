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
import { Loader2, X } from "lucide-react";
import { useEffect } from "react";
// Assuming you might use Sonner for notifications later
// import { toast } from "sonner";

const initialCheckinState: ActionResult = {
  success: false,
  message: "",
};

interface CheckInFormProps {
  place: Place; // The place selected for check-in
  onCancel: () => void; // Function to call when cancelling/closing the form
}

export function CheckInForm({ place, onCancel }: CheckInFormProps) {
  // Use useActionState for the check-in form submission
  const [state, formAction, isPending] = useActionState(
    submitCheckIn,
    initialCheckinState
  );

  // Optional: Show toast messages based on the action result
  useEffect(() => {
    if (state?.message && !isPending) {
      // Using console.log for now, replace with toast later if desired
      console.log(
        `Check-in attempt: ${state.message} (Success: ${state.success})`
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

  return (
    <div className="p-4 border border-primary rounded-lg mt-4 bg-card shadow-md relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1"
        onClick={onCancel}
        aria-label="Cancel check-in"
      >
        <X className="h-4 w-4" />
      </Button>
      <h3 className="text-lg font-semibold mb-1 font-heading">Check in at:</h3>
      <p className="mb-1 font-medium">{place.name}</p>
      <p className="text-sm text-muted-foreground mb-4">{place.address}</p>

      <form action={formAction}>
        {/* Hidden input to pass the selected place ID */}
        <input type="hidden" name="selectedPlaceId" value={place.id} />

        <div className="space-y-4">
          {/* Status Selection */}
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

          {/* Topic Preference */}
          <div>
            <Label htmlFor="topicPreference" className="mb-1 block font-medium">
              Topic (Optional):
            </Label>
            <Input
              id="topicPreference"
              name="topicPreference"
              placeholder="e.g., 'Talking tech', 'Reading', 'Open to chat'"
              maxLength={120} // Match schema limit
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              What are you up for discussing?
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking In...
              </>
            ) : (
              "Check In Here"
            )}
          </Button>

          {/* Display non-redirect error messages from the action */}
          {state?.message && !state.success && !isPending && (
            <p className="mt-2 text-sm text-red-600 text-center">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
