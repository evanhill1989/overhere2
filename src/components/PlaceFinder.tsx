"use client";

import { useState, useActionState, useEffect } from "react";
import dynamic from "next/dynamic"; // Import next/dynamic
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Loader2 } from "lucide-react";
// Actions
import {
  searchPlacesByQuery,
  type SearchActionResult,
} from "@/app/_actions/placeActions";
// Hooks & Types
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Place } from "@/types/places";

// Components
import { CheckInForm } from "@/components/CheckInForm";

// --- FIX: Dynamically import UserMap with ssr: false ---
const UserMap = dynamic(
  () => import("@/components/UserMap"), // Path to your UserMap component file
  {
    ssr: false, // This is the crucial part! Disables SSR for UserMap
    loading: () => (
      // Optional: Display a loading indicator while the map component loads
      <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground">
        Loading map...
      </div>
    ),
  }
);
// --- END FIX ---

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
    initialSearchState // Provide initial state matching SearchActionResult
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

  // Determine overall loading state
  const isLoading = isSearchPending || isGeoLoading || isNearbyLoading;

  useEffect(() => {
    if (searchState?.places) {
      setDisplayedPlaces(searchState.places);
      setSelectedPlaceForCheckin(null); // Clear selection when new search results load
      if (searchState.error)
        console.error("Search Action Error:", searchState.error);
    }
  }, [searchState]);

  useEffect(() => {
    if (nearbyPlaces.length > 0) {
      setDisplayedPlaces(nearbyPlaces);
      setSelectedPlaceForCheckin(null); // Clear selection when new nearby results load
      if (nearbyError) console.error("Nearby Search Hook Error:", nearbyError);
    } else if (!isNearbyLoading && userLocation) {
      // Handle case where nearby search finishes with zero results
      setDisplayedPlaces([]);
      setSelectedPlaceForCheckin(null);
    }
  }, [nearbyPlaces, nearbyError, isNearbyLoading, userLocation]);

  // --- Handlers ---
  const handleNearbySearchClick = () => {
    // Clear specific search results maybe? Or just let the effect override?
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

  return (
    <div className="flex flex-col h-screen">
      {/* Control Bar (as before) */}
      <div className="p-3 bg-card border-b border-border flex items-center gap-2">
        <form action={searchFormAction} className="flex-grow flex items-center">
          <Input /* ... name, placeholder, value, onChange, disabled ... */
            name="searchQuery"
            type="search"
            placeholder="Search place name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            aria-label="Search for a specific place"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="-ml-9 z-10"
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
        <Button /* ... variant, size, onClick, disabled ... */
          variant="outline"
          size="icon"
          onClick={handleNearbySearchClick}
          disabled={isLoading}
          aria-label="Find nearby places"
        >
          {isGeoLoading || isNearbyLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Map Area (as before) */}
      <div className="relative h-1/2 bg-muted flex-shrink-0">
        <UserMap
          places={displayedPlaces}
          selectedPlace={selectedPlaceForCheckin}
          userLocation={userLocation}
        />
        <p className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Map Area
        </p>
      </div>

      {/* Results List / CheckIn Form Area */}
      <div className="flex-grow border-t border-border overflow-y-auto bg-background p-2 min-h-0">
        {isLoading && (
          <div className="text-center p-4 flex justify-center items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        )}

        {!isLoading && selectedPlaceForCheckin ? (
          // If a place is selected, show the CheckInForm
          <CheckInForm
            place={selectedPlaceForCheckin}
            onCancel={handleCancelCheckin}
            // --- PASS USER LOCATION DOWN ---
            currentUserLocation={userLocation}
            // --- END ---
          />
        ) : !isLoading && displayedPlaces.length > 0 ? (
          // If NO place is selected AND we have places, show the list
          <ul className="space-y-1">
            {displayedPlaces.map((p) => (
              <li key={p.id}>
                {/* Make the whole item clickable */}
                <button
                  onClick={() => handlePlaceSelect(p)}
                  className="w-full text-left p-2 border border-transparent rounded hover:bg-muted hover:border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  aria-label={`Select ${p.name}`}
                >
                  <span className="font-medium">{p.name}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {p.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !isLoading &&
          displayedPlaces.length === 0 && (
            // If NO place selected and NO places found
            <p className="text-center p-4 text-muted-foreground">
              No places found. Try searching nearby or using a different name.
            </p>
          )
        )}
        {/* --- End Conditional Rendering --- */}

        {/* Display Errors (as before) */}
        {geoError && <p className="text-center p-2 text-red-600">{geoError}</p>}
        {searchState?.error && !isSearchPending && (
          <p className="text-center p-2 text-red-600">
            Search failed: {searchState.error}
          </p>
        )}
        {nearbyError && !isNearbyLoading && (
          <p className="text-center p-2 text-red-600">
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
