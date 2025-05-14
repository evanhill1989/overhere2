// components/PlaceFinder.tsx
"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, Loader2, Search as SearchIcon } from "lucide-react";
import {
  searchPlacesByQuery,
  type SearchActionResult,
} from "@/app/_actions/placeActions";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useAppLocation } from "@/context/LocationPermissionProvider"; // Use new context hook
import type { Place } from "@/types/places";
import { CheckInDialog } from "./CheckInDialog";
import dynamic from "next/dynamic";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import PlacesList from "./PlacesList";

gsap.registerPlugin(useGSAP);

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
    location: userLocationFromContext, // Renamed to avoid clash
    isLoadingGeo, // From context
    geoError, // From context
    requestBrowserLocationPermission, // Use this if manual trigger needed
    permissionStatus, // From context
  } = useAppLocation();

  const {
    places: nearbyPlaces,
    isLoading: isNearbyLoading,
    error: nearbyError,
    refetch: refetchNearby,
  } = useNearbyPlaces(userLocationFromContext); // useNearbyPlaces hook now uses location from context

  const [displayedPlaces, setDisplayedPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);

  const isLoadingOverall = isSearchPending || isLoadingGeo || isNearbyLoading;

  useEffect(() => {
    if (searchState?.places) {
      setDisplayedPlaces(searchState.places);
    }
  }, [searchState]);

  useEffect(() => {
    if (
      permissionStatus === "granted" &&
      userLocationFromContext &&
      !searchQuery &&
      searchAttempted
    ) {
      if (nearbyPlaces.length > 0) {
        setDisplayedPlaces(nearbyPlaces);
      } else if (!isNearbyLoading) {
        setDisplayedPlaces([]); // Nearby search finished with no results
      }
    } else if (!userLocationFromContext && searchAttempted && !searchQuery) {
      setDisplayedPlaces([]); // No location, clear places if it was a nearby attempt
    }
  }, [
    nearbyPlaces,
    isNearbyLoading,
    userLocationFromContext,
    permissionStatus,
    searchAttempted,
    searchQuery,
  ]);

  useEffect(() => {
    if (isSearchPending) {
      setDisplayedPlaces([]);
    }
  }, [isSearchPending]);

  useEffect(() => {
    if (
      permissionStatus === "granted" &&
      userLocationFromContext &&
      !searchAttempted &&
      !searchQuery
    ) {
      setSearchAttempted(true); // Consider initial load as an "attempt"
      // nearbyPlaces effect will handle setting displayedPlaces
    }
  }, [permissionStatus, userLocationFromContext, searchAttempted, searchQuery]);

  const handleNearbySearchClick = () => {
    setSearchAttempted(true);
    setDisplayedPlaces([]);
    setSearchQuery("");
    if (userLocationFromContext) {
      refetchNearby();
    } else {
      requestBrowserLocationPermission();
    }
  };

  let placesListContent: React.ReactNode = null;
  const onClickBox = useRef<HTMLDivElement>(null);
  const onLoadBox = useRef<HTMLDivElement>(null);

  useGSAP((context, contextSafe) => {
    console.log("context at top of useGSAP hook", context);
    if (onLoadBox.current) {
      gsap.to(onLoadBox.current, { rotation: 360, duration: 1 });
    }

    const onClickBoxAnimate = contextSafe(() => {
      gsap.to(onClickBox.current, { rotation: 360 });
      console.log("context", context);
    });
    const currentOnClickBoxTarget = onClickBox.current;
    if (currentOnClickBoxTarget) {
      onClickBox.current.addEventListener("click", onClickBoxAnimate);
      console.log("context", context);
      return () => {
        currentOnClickBoxTarget.removeEventListener("click", onClickBoxAnimate);
      };
    }
  });

  if (displayedPlaces.length > 0) {
    placesListContent = (
      <PlacesList
        displayedPlaces={displayedPlaces}
        currentUserLocation={userLocationFromContext}
      />
      // <ul className="space-y-1 pb-2">
      //   {displayedPlaces.map((place) => (
      //     <li className="flex" key={place.id}>
      //       <CheckInDialog
      //         place={place}
      //         currentUserLocation={userLocationFromContext}
      //       />
      //     </li>
      //   ))}
      // </ul>
    );
  } else if (
    searchAttempted &&
    displayedPlaces.length === 0 &&
    !isLoadingOverall
  ) {
    placesListContent = (
      <p className="text-muted-foreground p-4 text-center">
        No places found. Try searching nearby or using a different name.
      </p>
    );
  } else if (
    !searchAttempted &&
    displayedPlaces.length === 0 &&
    !isLoadingOverall
  ) {
    placesListContent = (
      <p className="text-muted-foreground p-4 text-center">
        Find places nearby or search for a specific spot.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* <button className="cursor-pointer bg-blue-600">
        Click me to move box
      </button>
      <div ref={onClickBox} className="h-20 w-12 bg-amber-400"></div>
      <div ref={onLoadBox} className="h-10 w-20 bg-green-500"></div> */}
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
        <p>or</p>
        <Button
          onClick={handleNearbySearchClick}
          disabled={isLoadingOverall || permissionStatus !== "granted"}
          aria-label="Find nearby places"
        >
          {isLoadingGeo ||
          (isNearbyLoading && searchAttempted && !searchQuery) ? (
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
          userLocation={userLocationFromContext}
        />
      </div>

      <div className="overflow-y-auto p-2">
        {isLoadingOverall && (
          <div className="flex items-center justify-center p-4 text-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        )}
        {!isLoadingOverall && placesListContent}
        {!isLoadingOverall && geoError && (
          <p className="p-2 text-center text-red-600">{geoError}</p>
        )}
        {!isLoadingOverall && searchState?.error && !isSearchPending && (
          <p className="p-2 text-center text-red-600">
            Search failed: {searchState.error}
          </p>
        )}
        {!isLoadingOverall &&
          nearbyError &&
          !isNearbyLoading &&
          !searchQuery && ( // Only show nearbyError if not in specific search mode
            <p className="p-2 text-center text-red-600">
              Nearby search failed: {nearbyError}
            </p>
          )}
      </div>
    </div>
  );
}
