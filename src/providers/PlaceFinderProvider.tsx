// src/providers/PlaceFinderProvider.tsx
"use client";

import { useState, useEffect, useRef, useContext, createContext } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { Coords, coordsSchema } from "@/lib/types/core";

type PlaceFinderContextType = {
  userLocation: Coords | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isInSearchMode: boolean;
  searchFormAction: (formData: FormData) => void;
  locationError: string | null;
  clearSearch: () => void;
};

const PlaceFinderContext = createContext<PlaceFinderContextType | null>(null);

export function PlaceFinderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useRef(createClient());
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<Coords | null>(null);

  const [ready, setReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isInSearchMode, setIsInSearchMode] = useState(false);

  // Geolocation setup (unchanged)
  useEffect(() => {
    const client = supabase.current;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const rawLocationData = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            };

            try {
              // ✅ CRITICAL FIX: Validate and brand the raw data
              const brandedLocationData: Coords =
                coordsSchema.parse(rawLocationData);

              setUserLocation(brandedLocationData);

              console.log(
                "📍 Real location:",
                pos.coords.latitude,
                pos.coords.longitude,
              );
              // ... rest of the success block
              setLocationError(null);
              setReady(true);
            } catch (e) {
              console.error("❌ Failed to parse/brand location data:", e);
              setLocationError("Failed to validate location coordinates.");
              setReady(false);
            }
          },
          (error) => {
            console.error("❌ Location error:", error);

            let errorMessage = "Unable to get your location.";

            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage =
                  "Location access denied. Please enable location permissions.";
                router.replace("/explain-location");
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage =
                  "Location information unavailable. Please check your device settings.";
                break;
              case error.TIMEOUT:
                errorMessage = "Location request timed out. Please try again.";
                break;
            }

            setLocationError(errorMessage);
            setReady(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          },
        );
      } else {
        setReady(false);
        setUserLocation(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const searchFormAction = (formData: FormData) => {
    const query = formData.get("searchQuery") as string;

    if (!query?.trim()) {
      clearSearch();
      return;
    }

    setIsInSearchMode(true);
    setSearchQuery(query.trim());
  };

  // ✅ Clear search function
  const clearSearch = () => {
    setIsInSearchMode(false);
    setSearchQuery("");
  };

  if (!ready || !userLocation) {
    if (locationError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <p className="text-destructive mb-4">{locationError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-primary underline"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Getting your location...</p>
      </div>
    );
  }

  return (
    <PlaceFinderContext.Provider
      value={{
        userLocation,
        searchQuery,
        setSearchQuery,
        isInSearchMode,
        searchFormAction,
        locationError,
        clearSearch,
      }}
    >
      {children}
    </PlaceFinderContext.Provider>
  );
}

export const usePlaceFinder = () => {
  const context = useContext(PlaceFinderContext);
  if (!context) throw new Error("PlaceFinder context not available");
  return context;
};
