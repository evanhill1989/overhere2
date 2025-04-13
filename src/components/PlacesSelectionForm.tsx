"use client"; // This component uses useActionState, needs to be client

import { useActionState } from "react";
import type { Place } from "@/hooks/useNearbyPlaces"; // Adjust path
import type { ActionResult } from "@/app/_actions/checkinActions"; // Import result type
import { submitCheckIn } from "@/app/_actions/checkinActions"; // Import the server action

type PlacesSelectionFormProps = {
  places: Place[];
  isLoading: boolean;
  error: string | null;
};

// Define an initial state that matches the expected structure of ActionResult or null
const initialCheckinState: ActionResult | null = null;

export function PlacesSelectionForm({
  places,
  isLoading,
  error,
}: PlacesSelectionFormProps) {
  // useActionState manages pending state and the result from submitCheckIn
  const [checkinState, formAction, isPendingCheckin] = useActionState(
    submitCheckIn, // The server action
    initialCheckinState // Initial state before any submission
  );

  if (isLoading) return <p>Loading nearby places...</p>;
  if (error) return <p className="text-orange-500">{error}</p>;
  if (places.length === 0 && !error && !isLoading) return null; // Or a message like "Click 'Find Nearby'..."

  return (
    <section>
      <h3 className="font-semibold">Select a Place to Check In:</h3>
      {/* Pass the formAction provided by useActionState to the form */}
      <form action={formAction} className="mt-2">
        {places.map((place) => (
          <label key={place.id} className="block mb-2 cursor-pointer">
            <input
              type="radio"
              name="selectedPlaceId" // MUST match the name expected in submitCheckIn
              value={place.id}
              required // Good practice for radio groups
              className="mr-2"
              // No onChange needed here for selection state if only submitting
            />
            <strong className="font-medium text-black">{place.name}</strong>
            <br />
            <small className="text-gray-500 ml-6">{place.address}</small>
          </label>
        ))}
        <button
          type="submit"
          disabled={isPendingCheckin} // Disable button while action is pending
          className={`px-4 py-2 rounded text-white font-medium mt-4 ${
            isPendingCheckin
              ? "bg-gray-500 cursor-wait"
              : "bg-green-500 hover:bg-green-700 cursor-pointer"
          }`}
        >
          {isPendingCheckin ? "Checking In..." : "Confirm Check In"}
        </button>
      </form>

      {/* Display the result message from the server action */}
      {checkinState && (
        // You might want to hide old messages when a new search starts
        <p
          className={`mt-2 font-bold ${
            checkinState.success ? "text-green-500" : "text-red-500"
          }`}
        >
          {checkinState.message}
        </p>
      )}
    </section>
  );
}
