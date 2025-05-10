"use client"; // Required for hooks like useState, useActionState

import { useState, useActionState, useEffect } from "react"; // Import useActionState
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Loader2, CheckCircle2 } from "lucide-react"; // Add Loader icon
// Action import
import {
  searchPlacesByQuery,
  type SearchActionResult,
} from "@/app/_actions/placeActions";

import { useNearbyPlaces } from "@/hooks/useNearbyPlaces"; // Keep using this for nearby
import { useGeolocation } from "@/hooks/useGeolocation";

import type { Place } from "@/types/places";
import { CheckInForm } from "@/components/CheckInForm";
import dynamic from "next/dynamic";

const UserMap = dynamic(
  () => import("@/components/UserMap"), // Direct import for default export
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted flex h-full w-full items-center justify-center">
        <Loader2 className="text-muted-foreground mr-2 h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">Loading map...</span>
      </div>
    ),
  },
);
// Initial state for the search action
const initialSearchState: SearchActionResult = {
  places: [],
  error: undefined,
  query: undefined,
};

export default function PlaceFinder() {
  // --- State Management ---
  // State for the specific search form action
  const [searchState, searchFormAction, isSearchPending] = useActionState(
    searchPlacesByQuery,
    initialSearchState, // Provide initial state matching SearchActionResult
  );

  const {
    location: userLocation,
    requestLocation,
    isLoading: isGeoLoading,
    error: geoError,
  } = useGeolocation();
  const {
    places: nearbyPlaces,
    isLoading: isNearbyLoading,
    error: nearbyError,
    refetch: refetchNearby,
  } = useNearbyPlaces(userLocation);

  // Combined state for display
  const [displayedPlaces, setDisplayedPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // Keep input controlled

  const [selectedPlaceForCheckin, setSelectedPlaceForCheckin] =
    useState<Place | null>(null);

  // --- NEW STATE: Track if a search has been attempted ---
  const [searchAttempted, setSearchAttempted] = useState(false);
  // --- END NEW STATE ---
  // Determine overall loading state
  const isLoading = isSearchPending || isGeoLoading || isNearbyLoading;

  useEffect(() => {
    if (searchState?.places) {
      setDisplayedPlaces(searchState.places);
      setSelectedPlaceForCheckin(null);

      if (searchState.error)
        console.error("Search Action Error:", searchState.error);
    }
  }, [searchState]);

  useEffect(() => {
    if (nearbyPlaces.length > 0) {
      setDisplayedPlaces(nearbyPlaces);
      setSelectedPlaceForCheckin(null);

      if (nearbyError) console.error("Nearby Search Hook Error:", nearbyError);
    } else if (!isNearbyLoading && userLocation) {
      // Handle case where nearby search finishes with zero results
      setDisplayedPlaces([]);
      setSelectedPlaceForCheckin(null);
    }
  }, [nearbyPlaces, nearbyError, isNearbyLoading, userLocation]);

  useEffect(() => {
    console.log("Search pending:", isSearchPending);
    if (isSearchPending) {
      // setSearchAttempted(true);
      setSelectedPlaceForCheckin(null);
      setDisplayedPlaces([]);
    }
  }, [isSearchPending]);

  // --- Handlers ---
  const handleNearbySearchClick = () => {
    // // Clear specific search results maybe? Or just let the effect override?
    setSearchAttempted(true);
    setDisplayedPlaces([]); // Clear previous results immediately
    setSearchQuery(""); // Clear search input
    if (userLocation) {
      refetchNearby(); // If location already known, just refetch
    } else {
      requestLocation(); // Otherwise, request location (which triggers useNearbyPlaces effect)
    }
  };
  // Handler for selecting a place from the list
  const handlePlaceSelect = (place: Place) => {
    setSelectedPlaceForCheckin(place);
  };

  // Handler to cancel/clear the check-in form
  const handleCancelCheckin = () => {
    setSelectedPlaceForCheckin(null);
  };

  // --- REFACTORED: Determine results content using if/else ---
  let resultsContent: React.ReactNode = null;

  if (isLoading) {
    resultsContent = (
      <div className="flex items-center justify-center p-4 text-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  } else if (selectedPlaceForCheckin) {
    // If a place is selected, show the CheckInForm
    resultsContent = (
      <CheckInForm
        place={selectedPlaceForCheckin}
        onCancel={handleCancelCheckin}
        currentUserLocation={userLocation}
      />
    );
  } else if (displayedPlaces.length > 0) {
    // If NO place is selected AND we have places, show the list
    resultsContent = (
      <ul className="space-y-1 pb-2">
        {displayedPlaces.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => handlePlaceSelect(p)}
              className="hover:bg-muted hover:border-border focus:ring-primary focus:border-primary w-full rounded border border-transparent p-2 text-left focus:ring-1 focus:outline-none"
              aria-label={`Select ${p.name}`}
            >
              <div className="flex items-center gap-1">
                {" "}
                {/* Wrapper for name and icon */}
                <span className="font-medium">{p.name}</span>
                {p.isVerified && (
                  <span title="Verified by overHere">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                  </span>
                )}
              </div>
              <br />
              <span className="text-muted-foreground text-xs">{p.address}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  } else if (searchAttempted && displayedPlaces.length === 0) {
    // If NO place selected, search WAS attempted, and NO places found
    resultsContent = (
      <p className="text-muted-foreground p-4 text-center">
        No places found. Try searching nearby or using a different name.
      </p>
    );
  } else if (!searchAttempted) {
    // Initial state before any search attempt
    resultsContent = <></>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center gap-2">
        <form action={searchFormAction} className="flex items-center">
          <Input
            name="searchQuery"
            type="search"
            placeholder="Search specific places"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search for a specific place"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="z-10 -ml-9"
            disabled={isLoading || !searchQuery.trim()}
            aria-label="Submit search"
          >
            {isSearchPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p>or</p>
        <Button
          variant="outline"
          onClick={handleNearbySearchClick}
          disabled={isLoading}
          aria-label="Find nearby places"
        >
          {isGeoLoading || isNearbyLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <LocateFixed className="h-5 w-5" />
              <span className="">Find nearby places</span>
            </>
          )}
        </Button>
      </div>

      {/* Map Area (as before) */}
      <div className="bg-muted relative flex-grow">
        <UserMap
          places={displayedPlaces}
          selectedPlace={selectedPlaceForCheckin}
          userLocation={userLocation}
        />
      </div>

      {/* Results List / CheckIn Form Area */}
      <div className="h-1/3 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center p-4 text-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        )}

        {/* --- Render CheckInForm OR Place List --- */}
        {/* Results List / CheckIn Form Area */}
        <div className="min-h-0 flex-grow overflow-y-auto p-2">
          {/* Render the determined content */}
          {resultsContent}

          {/* Display Errors Separately (keeps logic clean) */}
          {!isLoading && geoError && (
            <p className="p-2 text-center text-red-600">{geoError}</p>
          )}
          {!isLoading && searchState?.error && !isSearchPending && (
            <p className="p-2 text-center text-red-600">
              Search failed: {searchState.error}
            </p>
          )}
          {!isLoading && nearbyError && !isNearbyLoading && (
            <p className="p-2 text-center text-red-600">
              Nearby search failed: {nearbyError}
            </p>
          )}
        </div>

        {/* Display Errors (as before) */}
        {geoError && <p className="p-2 text-center text-red-600">{geoError}</p>}
        {searchState?.error && !isSearchPending && (
          <p className="p-2 text-center text-red-600">
            Search failed: {searchState.error}
          </p>
        )}
        {nearbyError && !isNearbyLoading && (
          <p className="p-2 text-center text-red-600">
            Nearby search failed: {nearbyError}
          </p>
        )}
      </div>
    </div>
  );
}

// Dummy Search Icon for placeholder
function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
