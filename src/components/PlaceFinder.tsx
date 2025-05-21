"use client";

import { useState, useActionState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search as SearchIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  searchPlacesByQuery,
  type SearchActionResult,
} from "@/app/_actions/placeActions";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useAppLocation } from "@/context/LocationPermissionProvider";
// import type { Place } from "@/types/places";
import dynamic from "next/dynamic";
import PlacesList from "./PlacesList";
import PlacesContent from "./PlacesContent";

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  // DrawerDescription, // Optional, add if you have more descriptive text
} from "@/components/ui/drawer";
import { DialogTitle } from "./ui/dialog";

const UserMap = dynamic(() => import("@/components/UserMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted absolute inset-0 z-0 flex h-full w-full items-center justify-center">
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
  const [isResultsDrawerOpen, setIsResultsDrawerOpen] = useState(false);

  const isLoadingOverall = isSearchPending || isLoadingGeo || isNearbyLoading;

  useEffect(() => {
    if (
      (isSearchPending && searchQuery) ||
      (isNearbyLoading && !searchQuery) ||
      (isLoadingGeo && !userLocationFromContext)
    ) {
      if (!isResultsDrawerOpen && (searchAttempted || isLoadingOverall))
        setIsResultsDrawerOpen(true);
    } else if (searchAttempted && !isLoadingOverall) {
      setIsResultsDrawerOpen(true);
    }
  }, [
    isLoadingOverall,
    searchAttempted,
    isSearchPending,
    searchQuery,
    isNearbyLoading,
    isLoadingGeo,
    userLocationFromContext,
    isResultsDrawerOpen,
  ]);

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
    if (isSearchPending && searchQuery) return [];
    if (searchQuery && searchState?.places) return searchState.places;
    if (
      !searchQuery &&
      permissionStatus === "granted" &&
      userLocationFromContext &&
      searchAttempted
    ) {
      return nearbyPlaces;
    }
    return [];
  }, [
    isSearchPending,
    searchQuery,
    searchState,
    permissionStatus,
    userLocationFromContext,
    searchAttempted,
    nearbyPlaces,
  ]);

  const handleSearchFormSubmit = () => {
    setSearchAttempted(true);
    setIsResultsDrawerOpen(true);
  };

  // const handleNearbySearchClick = () => {
  //   setSearchAttempted(true);
  //   setIsResultsDrawerOpen(true);
  //   setSearchQuery("");
  //   if (userLocationFromContext) {
  //     refetchNearby();
  //   } else if (permissionStatus === "prompt" || permissionStatus === "denied") {
  //     requestBrowserLocationPermission();
  //   }
  // };

  let placesListRenderContent: React.ReactNode = null;
  if (derivedDisplayedPlaces.length > 0) {
    placesListRenderContent = (
      <PlacesList
        displayedPlaces={derivedDisplayedPlaces}
        currentUserLocation={userLocationFromContext}
      />
    );
  } else if (searchAttempted && !isLoadingOverall) {
    placesListRenderContent = (
      <p className="text-muted-foreground p-4 text-center">
        No places found. Try a different search or explore nearby.
      </p>
    );
  } else if (
    !searchAttempted &&
    !isLoadingOverall &&
    (permissionStatus === "granted" ||
      permissionStatus === "prompt" ||
      permissionStatus === "denied" ||
      permissionStatus === "error")
  ) {
    placesListRenderContent = (
      <p className="text-muted-foreground p-4 text-center">
        Search for places or find what's nearby.
      </p>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <UserMap
          places={derivedDisplayedPlaces}
          selectedPlace={null}
          userLocation={userLocationFromContext}
        />
      </div>

      <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 flex justify-center p-3 sm:p-4">
        <div className="bg-background pointer-events-auto flex w-full max-w-md flex-col items-center gap-2 rounded-lg p-3 shadow-xl sm:p-4">
          <form
            action={searchFormAction}
            className="flex w-full items-center"
            onSubmit={handleSearchFormSubmit}
          >
            <Input
              name="searchQuery"
              type="search"
              placeholder="Search places by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search for a specific place"
              disabled={isLoadingOverall}
              className="flex-grow pr-10"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="z-10 -ml-9 shrink-0"
              disabled={isLoadingOverall || !searchQuery.trim()}
              aria-label="Submit search"
            >
              {isSearchPending && searchQuery ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      <Drawer
        open={isResultsDrawerOpen}
        onOpenChange={setIsResultsDrawerOpen}
        modal={false}
      >
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 shadow-lg md:hidden"
            aria-label={isResultsDrawerOpen ? "Hide results" : "Show results"}
          >
            {isResultsDrawerOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            {isResultsDrawerOpen ? "Hide" : "Results"}
          </Button>
        </DrawerTrigger>
        <DrawerContent
          aria-describedby="places-content-description"
          className="flex max-h-[60vh] flex-col focus:outline-none md:fixed md:top-[calc(var(--header-height,60px)+1.5rem)] md:right-4 md:bottom-4 md:z-10 md:h-auto md:max-h-[unset] md:w-80 lg:w-96"
        >
          <div className="mx-auto flex h-full w-full flex-col">
            <div className="flex flex-shrink-0 cursor-grab justify-center p-4 active:cursor-grabbing md:hidden">
              <div className="bg-muted h-1.5 w-8 rounded-full" />
            </div>
            <DrawerHeader className="px-4 pt-0 text-center md:pt-2 md:text-left">
              <DrawerTitle id="places-drawer-title">
                {searchQuery ? `Results for "${searchQuery}"` : "Nearby Places"}
              </DrawerTitle>
              <DialogTitle className="sr-only">
                {searchQuery ? `Results for "${searchQuery}"` : "Nearby Places"}
              </DialogTitle>
              {/* <DrawerDescription id="places-content-description">
                Scroll to see places.
              </DrawerDescription> */}
            </DrawerHeader>
            <PlacesContent
              isLoadingOverall={isLoadingOverall}
              placesListContent={placesListRenderContent}
              geoError={geoError ?? undefined}
              searchStateError={
                searchState?.query === searchQuery &&
                derivedDisplayedPlaces.length === 0
                  ? searchState?.error
                  : undefined
              }
              isSearchPending={
                isSearchPending && searchQuery === searchState?.query
              }
              nearbyError={
                !searchQuery ? (nearbyError ?? undefined) : undefined
              }
              isNearbyLoading={!searchQuery ? isNearbyLoading : false}
              searchQuery={searchQuery}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
