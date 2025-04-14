"use client";

import { useActionState } from "react";
import type { Place } from "@/hooks/useNearbyPlaces";
import type { ActionResult } from "@/app/_actions/checkinActions";
import { submitCheckIn } from "@/app/_actions/checkinActions";

type PlacesSelectionFormProps = {
  places: Place[];
  isLoading: boolean;
  error: string | null;
};

const initialCheckinState: ActionResult | null = null;

export function PlacesSelectionForm({
  places,
  isLoading,
  error,
}: PlacesSelectionFormProps) {
  const [checkinState, formAction, isPendingCheckin] = useActionState(
    submitCheckIn,
    initialCheckinState
  );

  if (isLoading) return <p>Loading nearby places...</p>;
  if (error) return <p className="text-orange-500">{error}</p>;
  if (places.length === 0 && !error && !isLoading) return null;
  return (
    <section>
      <h3 className="font-semibold">Select a Place to Check In:</h3>

      <form action={formAction} className="mt-2 space-y-4">
        {" "}
        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
            Select a Place: <span className="text-red-600">*</span>{" "}
          </legend>
          {places.map((place) => (
            <label
              key={place.id}
              className="block p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/30 has-[:checked]:border-blue-400 dark:has-[:checked]:border-blue-700"
            >
              <input
                type="radio"
                name="selectedPlaceId"
                value={place.id}
                required
                className="mr-3 align-middle focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-500"
              />
              <span className="font-medium align-middle text-gray-900 dark:text-white">
                {" "}
                {place.name}
              </span>
              <br />
              <small className="text-gray-500 dark:text-gray-400 ml-7">
                {place.address}
              </small>{" "}
            </label>
          ))}
        </fieldset>
        <div>
          <label
            htmlFor="topicPreference"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Optional Conversation Topic
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="topicPreference"
              id="topicPreference"
              maxLength={120}
              placeholder="E.g., Astronomy, local events, currently reading..."
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Your Status <span className="text-red-600">*</span>{" "}
          </label>
          <div className="mt-1">
            <select
              name="status" // Should match the name used in submitCheckIn/schema
              id="status" // Connects label
              required // Make sure user selects a status
              defaultValue="available" // Default to 'available'
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" // Basic styling
            >
              <option value="available">Available for Chat</option>
              <option value="busy">Busy / Just Working</option>
            </select>
          </div>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPendingCheckin}
            className={`w-full px-4 py-2 rounded text-white font-medium transition-colors ${
              isPendingCheckin
                ? "bg-gray-500 cursor-wait"
                : "bg-green-500 hover:bg-green-700 cursor-pointer"
            }`}
          >
            {isPendingCheckin ? "Checking In..." : "Confirm Check In"}
          </button>
        </div>
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
