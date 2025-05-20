"use client";

import { useState, useActionState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search as SearchIcon } from "lucide-react";
import {
  searchPlacesByQuery,
  type SearchActionResult,
} from "@/app/_actions/placeActions";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useAppLocation } from "@/context/LocationPermissionProvider";

import dynamic from "next/dynamic";
import PlacesList from "./PlacesList";
import PlacesContent from "./PlacesContent";

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
    location: userLocationFromContext,
    isLoadingGeo,
    geoError,
    // requestBrowserLocationPermission,
    permissionStatus,
  } = useAppLocation();

  const {
    places: nearbyPlaces,
    isLoading: isNearbyLoading,
    error: nearbyError,
    // refetch: refetchNearby,
  } = useNearbyPlaces(userLocationFromContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);

  const isLoadingOverall = isSearchPending || isLoadingGeo || isNearbyLoading;

  useEffect(() => {
    if (
      permissionStatus === "granted" &&
      userLocationFromContext &&
      !searchAttempted &&
      !searchQuery
    ) {
      setSearchAttempted(true);
    }
  }, [permissionStatus, userLocationFromContext, searchAttempted, searchQuery]);

  const derivedDisplayedPlaces = useMemo(() => {
    if (isSearchPending) {
      // If a text search is actively pending, show no results yet
      return [];
    }
    if (searchQuery && searchState?.places) {
      // If there's an active text search query and it has results
      return searchState.places;
    }
    if (
      !searchQuery &&
      permissionStatus === "granted" &&
      userLocationFromContext &&
      searchAttempted
    ) {
      // If no active text search, but location is granted and a nearby search was "attempted"
      return nearbyPlaces; // This will be [] if nearby search yielded no results but completed
    }
    return []; // Default to empty if no relevant conditions met
  }, [
    isSearchPending,
    searchQuery,
    searchState,
    permissionStatus,
    userLocationFromContext,
    searchAttempted,
    nearbyPlaces,
  ]);

  // const handleNearbySearchClick = () => {
  //   setSearchAttempted(true);
  //   setSearchQuery("");
  //   if (userLocationFromContext) {
  //     refetchNearby();
  //   } else {
  //     requestBrowserLocationPermission();
  //   }
  // };

  const handleSearchFormSubmit = () => {
    setSearchAttempted(true);
  };

  let placesListContent: React.ReactNode = null;

  if (derivedDisplayedPlaces.length > 0) {
    placesListContent = (
      <PlacesList
        displayedPlaces={derivedDisplayedPlaces}
        currentUserLocation={userLocationFromContext}
      />
    );
  } else if (searchAttempted && !isLoadingOverall) {
    placesListContent = (
      <p className="text-muted-foreground p-4 text-center">
        No places found. Try searching nearby or using a different name.
      </p>
    );
  } else if (!searchAttempted && !isLoadingOverall) {
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
          onSubmit={handleSearchFormSubmit}
        >
          <Input
            name="searchQuery"
            type="search"
            placeholder="Search specific places"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search for a specific place"
            disabled={isLoadingOverall}
            className="pr-10"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="z-10 -ml-9"
            disabled={isLoadingOverall || !searchQuery.trim()}
            aria-label="Submit search"
          >
            {isSearchPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SearchIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      <div className="bg-muted relative flex-grow">
        <UserMap
          places={derivedDisplayedPlaces}
          selectedPlace={null}
          userLocation={userLocationFromContext}
        />
      </div>

      <PlacesContent
        isLoadingOverall={isLoadingOverall}
        placesListContent={placesListContent}
        geoError={geoError ?? undefined}
        searchStateError={
          searchState?.query === searchQuery ? searchState?.error : undefined
        }
        isSearchPending={isSearchPending && searchQuery === searchState?.query}
        nearbyError={!searchQuery ? (nearbyError ?? undefined) : undefined}
        isNearbyLoading={!searchQuery ? isNearbyLoading : false}
        searchQuery={searchQuery}
      />
    </div>
  );
}
