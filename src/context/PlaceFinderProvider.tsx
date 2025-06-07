// src/context/PlaceFinderProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import { useActionState } from "react";
import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";
import { useAppLocation } from "./LocationPermissionProvider"; // Assumes this is a separate context
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import {
  searchPlacesByQuery,
  type SearchActionResult,
} from "@/app/_actions/placeActions";

interface PlaceFinderContextType {
  derivedDisplayedPlaces: Place[];
  userLocation: LocationData | null;
  isLoadingOverall: boolean;
  searchFormAction: (payload: FormData) => void;
  isSearchPending: boolean;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  // Add other states and handlers as needed by children
}

const PlaceFinderContext = createContext<PlaceFinderContextType | undefined>(
  undefined,
);

const initialSearchState: SearchActionResult = {
  places: [],
  error: undefined,
  query: undefined,
};

export function PlaceFinderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchState, searchFormAction, isSearchPending] = useActionState(
    searchPlacesByQuery,
    initialSearchState,
  );
  const {
    location: userLocationFromContext,
    isLoadingGeo,
    permissionStatus,
  } = useAppLocation();
  const { places: nearbyPlaces, isLoading: isNearbyLoading } = useNearbyPlaces(
    userLocationFromContext,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);

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

  const isLoadingOverall = isSearchPending || isLoadingGeo || isNearbyLoading;

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

  const value = {
    derivedDisplayedPlaces,
    userLocation: userLocationFromContext,
    isLoadingOverall,
    searchFormAction,
    isSearchPending,
    searchQuery,
    setSearchQuery,
    // Provide other states/handlers like errors if children need them
  };

  return (
    <PlaceFinderContext.Provider value={value}>
      {children}
    </PlaceFinderContext.Provider>
  );
}

export function usePlaceFinder() {
  const context = useContext(PlaceFinderContext);
  if (context === undefined) {
    throw new Error("usePlaceFinder must be used within a PlaceFinderProvider");
  }
  return context;
}
