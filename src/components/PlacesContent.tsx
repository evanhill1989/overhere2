// src/components/PlacesContent.tsx
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
    <div className="bg-background dark:bg-card pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-t-lg shadow-xl md:rounded-lg">
      <div className="dark:border-border shrink-0 border-b p-3">
        <h3 className="text-center text-sm font-semibold md:text-left">
          {searchQuery ? `Results for "${searchQuery}"` : "Nearby Places"}
        </h3>
      </div>

      <div className="flex-grow overflow-y-auto p-1 md:p-2">
        {isLoadingOverall && (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
          </div>
        )}
        {!isLoadingOverall && placesListContent}
        {!isLoadingOverall && geoError && (
          <p className="p-2 text-center text-sm text-red-600">{geoError}</p>
        )}
        {!isLoadingOverall && searchStateError && !isSearchPending && (
          <p className="p-2 text-center text-sm text-red-600">
            Search failed: {searchStateError}
          </p>
        )}
        {!isLoadingOverall &&
          nearbyError &&
          !isNearbyLoading &&
          !searchQuery && (
            <p className="p-2 text-center text-sm text-red-600">
              Nearby search failed: {nearbyError}
            </p>
          )}
      </div>
    </div>
  );
}
