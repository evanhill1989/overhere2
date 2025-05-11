"use client";

import { useState, useActionState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LocateFixed,
  Loader2,
  CheckCircle2,
  Search as SearchIcon,
} from "lucide-react";
import {
  searchPlacesByQuery,
  type SearchActionResult,
} from "@/app/_actions/placeActions";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Place } from "@/types/places";
import { CheckInForm } from "@/components/CheckInForm";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckInDialog } from "./CheckInDialog";

const UserMap = dynamic(() => import("@/components/UserMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <Loader2 className="text-muted-foreground mr-2 h-6 w-6 animate-spin" />
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  ),
});

const initialSearchState: SearchActionResult = {
  places: [],
  error: undefined,
  query: undefined,
};

export default function PlaceFinder() {
  const [searchState, searchFormAction, isSearchPending] = useActionState(
    searchPlacesByQuery,
    initialSearchState,
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

  const [displayedPlaces, setDisplayedPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);

  const isLoading = isSearchPending || isGeoLoading || isNearbyLoading;

  useEffect(() => {
    if (searchState?.places) {
      setDisplayedPlaces(searchState.places);
    }
  }, [searchState]);

  useEffect(() => {
    if (nearbyPlaces.length > 0) {
      setDisplayedPlaces(nearbyPlaces);
    } else if (
      !isNearbyLoading &&
      userLocation &&
      searchAttempted &&
      searchQuery === ""
    ) {
      setDisplayedPlaces([]);
    }
  }, [
    nearbyPlaces,
    nearbyError,
    isNearbyLoading,
    userLocation,
    searchAttempted,
    searchQuery,
  ]);

  useEffect(() => {
    if (isSearchPending) {
      setDisplayedPlaces([]);
    }
  }, [isSearchPending]);

  const handleNearbySearchClick = () => {
    setSearchAttempted(true);
    setDisplayedPlaces([]);
    setSearchQuery("");
    if (userLocation) {
      refetchNearby();
    } else {
      requestLocation();
    }
  };

  let placesListContent: React.ReactNode = null;

  if (displayedPlaces.length > 0) {
    placesListContent = (
      <ul className="space-y-1 pb-2">
        {displayedPlaces.map((place) => (
          <li key={place.id}>
            <CheckInDialog place={place} currentUserLocation={userLocation} />
          </li>
        ))}
      </ul>
    );
  } else if (searchAttempted && displayedPlaces.length === 0) {
    placesListContent = (
      <p className="text-muted-foreground p-4 text-center">
        No places found. Try searching nearby or using a different name.
      </p>
    );
  } else if (!searchAttempted && displayedPlaces.length === 0) {
    placesListContent = (
      <p className="text-muted-foreground p-4 text-center">
        Find places nearby or search for a specific spot.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center gap-2">
        <form
          action={searchFormAction}
          className="flex items-center"
          onSubmit={() => setSearchAttempted(true)}
        >
          <Input
            name="searchQuery"
            type="search"
            placeholder="Search specific places"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search for a specific place"
            disabled={isLoading}
            className="pr-10"
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
              <SearchIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p>or</p>
        <Button
          onClick={handleNearbySearchClick}
          disabled={isLoading}
          aria-label="Find nearby places"
        >
          {isGeoLoading || isNearbyLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <LocateFixed className="h-5 w-5" />
              <span>Find nearby places</span>
            </>
          )}
        </Button>
      </div>

      <div className="bg-muted relative flex-grow">
        <UserMap
          places={displayedPlaces}
          selectedPlace={null}
          userLocation={userLocation}
        />
      </div>

      <div className="overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center p-4 text-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        )}
        {!isLoading && placesListContent}
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
    </div>
  );
}

// Dummy Search Icon if not imported from lucide-react directly
// function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
//   return (
//     <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <circle cx="11" cy="11" r="8" /> <path d="m21 21-4.3-4.3" /> </svg>
//   );
// }
