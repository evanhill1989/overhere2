import React from "react";
import { Loader2 } from "lucide-react";

interface PlacesContentProps {
  isLoadingOverall: boolean;
  placesListContent: React.ReactNode;
  geoError?: string;
  searchStateError?: string;
  isSearchPending: boolean;
  nearbyError?: string;
  isNearbyLoading: boolean;
  searchQuery: string;
}

export default function PlacesContent({
  isLoadingOverall,
  placesListContent,
  geoError,
  searchStateError,
  isSearchPending,
  nearbyError,
  isNearbyLoading,
  searchQuery,
}: PlacesContentProps) {
  return (
    <div className="wrapper dark:bg-background flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700">
      <h3>Places near you</h3>
      <div className="overflow-y-auto">
        {isLoadingOverall && (
          <div className="flex items-center justify-center p-4 text-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        )}
        {!isLoadingOverall && placesListContent}
        {!isLoadingOverall && geoError && (
          <p className="p-2 text-center text-red-600">{geoError}</p>
        )}
        {!isLoadingOverall && searchStateError && !isSearchPending && (
          <p className="p-2 text-center text-red-600">
            Search failed: {searchStateError}
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
