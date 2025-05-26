"use client";

import { useState, useActionState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LocateFixed,
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
import type { Place } from "@/types/places";
import dynamic from "next/dynamic";
import PlacesList from "./PlacesList";
// import PlacesContent from "./PlacesContent";
import { CheckInForm } from "@/components/CheckInForm";

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DialogTitle } from "@radix-ui/react-dialog";

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
    requestBrowserLocationPermission,
    permissionStatus,
  } = useAppLocation();

  const {
    places: nearbyPlaces,
    isLoading: isNearbyLoading,
    error: nearbyError,
    refetch: refetchNearby,
  } = useNearbyPlaces(userLocationFromContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isResultsDrawerOpen, setIsResultsDrawerOpen] = useState(false);
  const [hasManuallyClosedDrawer, setHasManuallyClosedDrawer] = useState(false);
  const [placeForCheckinForm, setPlaceForCheckinForm] = useState<Place | null>(
    null,
  );

  const isLoadingOverall = isSearchPending || isLoadingGeo || isNearbyLoading;

  useEffect(() => {
    if (
      permissionStatus === "granted" &&
      userLocationFromContext &&
      !searchAttempted &&
      !searchQuery
    ) {
      setSearchAttempted(true);
      if (!hasManuallyClosedDrawer) setIsResultsDrawerOpen(true);
    }
  }, [
    permissionStatus,
    userLocationFromContext,
    searchAttempted,
    searchQuery,
    hasManuallyClosedDrawer,
  ]);

  const derivedDisplayedPlaces = useMemo(() => {
    if (isSearchPending && searchQuery) return [];
    if (searchQuery && searchState?.places && searchState.query === searchQuery)
      return searchState.places;
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

  useEffect(() => {
    if (isLoadingOverall && !hasManuallyClosedDrawer) {
      setIsResultsDrawerOpen(true);
    } else if (
      searchAttempted &&
      !isLoadingOverall &&
      !hasManuallyClosedDrawer &&
      (derivedDisplayedPlaces.length > 0 ||
        searchState?.error ||
        nearbyError ||
        geoError ||
        placeForCheckinForm)
    ) {
      setIsResultsDrawerOpen(true);
    }
  }, [
    isLoadingOverall,
    searchAttempted,
    derivedDisplayedPlaces,
    searchState,
    nearbyError,
    geoError,
    hasManuallyClosedDrawer,
    placeForCheckinForm,
  ]);

  const handleActionInitiatingSearchOrNearby = () => {
    setSearchAttempted(true);
    setPlaceForCheckinForm(null);
    setIsResultsDrawerOpen(true);
    setHasManuallyClosedDrawer(false);
  };

  const handleSearchFormSubmit = () => handleActionInitiatingSearchOrNearby();

  const handleNearbySearchClick = () => {
    handleActionInitiatingSearchOrNearby();
    setSearchQuery("");
    if (userLocationFromContext) {
      refetchNearby();
    } else if (permissionStatus === "prompt" || permissionStatus === "denied") {
      requestBrowserLocationPermission();
    }
  };

  const handleSelectPlaceForCheckin = (place: Place) => {
    setPlaceForCheckinForm(place);
    setIsResultsDrawerOpen(true);
    setHasManuallyClosedDrawer(false);
  };

  const handleCloseCheckinFormOrDrawer = () => {
    setPlaceForCheckinForm(null);
    setIsResultsDrawerOpen(false);
    setHasManuallyClosedDrawer(true);
  };

  let placesListRenderContent: React.ReactNode = null;
  if (derivedDisplayedPlaces.length > 0) {
    placesListRenderContent = (
      <PlacesList
        displayedPlaces={derivedDisplayedPlaces}
        currentUserLocation={userLocationFromContext}
        onListItemClick={handleSelectPlaceForCheckin}
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

  const drawerTitle = placeForCheckinForm
    ? `Check in: ${placeForCheckinForm.name}`
    : searchQuery && searchAttempted
      ? `Results for "${searchQuery}"`
      : "Nearby Places";

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <UserMap
          places={derivedDisplayedPlaces}
          selectedPlace={placeForCheckinForm}
          userLocation={userLocationFromContext}
          onPlaceMarkerClick={handleSelectPlaceForCheckin}
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
              {isSearchPending &&
              searchQuery === searchState?.query &&
              searchQuery !== "" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
            </Button>
          </form>

          <Button
            onClick={handleNearbySearchClick}
            disabled={isLoadingOverall || permissionStatus !== "granted"}
            aria-label="Find nearby places"
            variant="outline"
            size="sm"
            className="w-full max-w-xs"
          >
            {isLoadingGeo || (isNearbyLoading && !searchQuery) ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LocateFixed className="mr-2 h-5 w-5" />
            )}
            Find nearby places
          </Button>
        </div>
      </div>

      <Drawer
        open={isResultsDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCheckinFormOrDrawer();
          } else {
            setIsResultsDrawerOpen(true);
            setHasManuallyClosedDrawer(false); // Explicitly opening overrides manual close
          }
        }}
        modal={false}
      >
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background hover:bg-muted fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 shadow-lg md:hidden"
            aria-label={isResultsDrawerOpen ? "Hide results" : "Show results"}
          >
            {isResultsDrawerOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            {isResultsDrawerOpen
              ? "Hide"
              : (searchAttempted && derivedDisplayedPlaces.length > 0) ||
                  placeForCheckinForm
                ? "Results"
                : "Find Places"}
          </Button>
        </DrawerTrigger>
        <DrawerContent
          aria-describedby="places-content-description"
          className="bg-background flex max-h-[60vh] flex-col focus:outline-none md:fixed md:top-[calc(var(--header-height,60px)+1.5rem)] md:right-4 md:bottom-4 md:z-10 md:h-auto md:max-h-[unset] md:w-80 lg:w-96"
        >
          <div className="mx-auto flex h-full w-full flex-col">
            <div className="flex flex-shrink-0 cursor-grab justify-center p-4 active:cursor-grabbing md:hidden">
              <div className="bg-muted h-1.5 w-8 rounded-full" />
            </div>
            <DrawerHeader className="px-4 pt-0 text-center md:pt-2 md:text-left">
              <DrawerTitle id="places-drawer-title">{drawerTitle}</DrawerTitle>
              <DialogTitle className="sr-only">{drawerTitle}</DialogTitle>
            </DrawerHeader>

            <div className="flex-grow overflow-y-auto p-1 md:p-2">
              {isLoadingOverall && !placeForCheckinForm && (
                <div className="flex h-full items-center justify-center p-4 text-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
                </div>
              )}
              {!isLoadingOverall && placeForCheckinForm && (
                <CheckInForm
                  place={placeForCheckinForm}
                  currentUserLocation={userLocationFromContext}
                  onCancel={handleCloseCheckinFormOrDrawer}
                  onSuccessfulCheckin={handleCloseCheckinFormOrDrawer}
                />
              )}
              {!isLoadingOverall &&
                !placeForCheckinForm &&
                placesListRenderContent}

              {!isLoadingOverall && !placeForCheckinForm && geoError && (
                <p className="p-2 text-center text-sm text-red-600">
                  {geoError}
                </p>
              )}
              {!isLoadingOverall &&
                !placeForCheckinForm &&
                searchState?.error &&
                !isSearchPending &&
                searchState.query === searchQuery &&
                derivedDisplayedPlaces.length === 0 && (
                  <p className="p-2 text-center text-sm text-red-600">
                    Search failed: {searchState.error}
                  </p>
                )}
              {!isLoadingOverall &&
                !placeForCheckinForm &&
                nearbyError &&
                !isNearbyLoading &&
                !searchQuery && (
                  <p className="p-2 text-center text-sm text-red-600">
                    Nearby search failed: {nearbyError}
                  </p>
                )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
