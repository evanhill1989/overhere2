// src/components/PlaceFinder.tsx
"use client";

import {
  PlaceFinderProvider,
  usePlaceFinder,
} from "@/context/PlaceFinderProvider"; // Import provider and hook
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search as SearchIcon } from "lucide-react";
import dynamic from "next/dynamic";
import PlacesList from "./PlacesList"; // PlacesList will now use the hook internally

const UserMap = dynamic(() => import("@/components/UserMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted absolute inset-0 z-0 flex h-full w-full items-center justify-center">
      <Loader2 className="text-muted-foreground mr-2 h-6 w-6 animate-spin" />
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  ),
});

function PlaceFinderUI() {
  // This new component contains the actual UI and uses the context
  const {
    derivedDisplayedPlaces,
    userLocation,
    isLoadingOverall,
    searchFormAction,
    isSearchPending,
    searchQuery,
    setSearchQuery,
  } = usePlaceFinder();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <UserMap
          places={derivedDisplayedPlaces}
          selectedPlace={null}
          userLocation={userLocation}
        />
      </div>

      <div className="pointer-events-none absolute top-0 right-0 left-0 z-100 flex justify-center p-3 sm:p-4">
        <div className="bg-background pointer-events-auto flex w-full max-w-md flex-col items-center gap-2 rounded-lg p-3 shadow-xl sm:p-4">
          <form action={searchFormAction} className="flex w-full items-center">
            <Input
              name="searchQuery"
              type="search"
              placeholder="Search places by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoadingOverall}
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={isLoadingOverall || !searchQuery.trim()}
            >
              {isSearchPending && searchQuery ? <Loader2 /> : <SearchIcon />}
            </Button>
          </form>
          {/* You might add the "Nearby" button back here, calling a function from the context */}
        </div>
      </div>

      <div className="absolute right-0 bottom-0 left-0 z-10 h-[40%] md:left-auto md:w-1/3 ...">
        {/* The PlacesList component would be rendered here, and it would get its data from usePlaceFinder() */}
        {isLoadingOverall ? <Loader2 /> : <PlacesList />}
      </div>
    </div>
  );
}

export default function PlaceFinder() {
  return (
    <PlaceFinderProvider>
      <PlaceFinderUI />
    </PlaceFinderProvider>
  );
}
