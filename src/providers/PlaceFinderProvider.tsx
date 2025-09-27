// src/context/PlaceFinderProvider.tsx - SIMPLER VERSION
"use client";

import { useState, useEffect, useRef, useContext, createContext } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Place } from "@/lib/types/places";

import { searchPlaces } from "@/app/_actions/searchPlaces";

type PlaceFinderContextType = {
  userLocation: GeolocationCoordinates | null;
  derivedDisplayedPlaces: Place[];
  isLoadingOverall: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isSearchPending: boolean;
  searchFormAction: (formData: FormData) => void;
  locationError: string | null;
};

const PlaceFinderContext = createContext<PlaceFinderContextType | null>(null);

export function PlaceFinderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useRef(createClient());
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
  } | null>(null);
  const [derivedDisplayedPlaces, setDerivedDisplayedPlaces] = useState<Place[]>(
    [],
  );
  const [ready, setReady] = useState(false);
  const [isSearchPending, setIsSearchPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  // Geolocation setup - FIXED VERSION WITHOUT MOCK COORDINATES
  useEffect(() => {
    const client = supabase.current;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Request real location
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const locationData = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            };
            setUserLocation(locationData);
            console.log(
              "📍 Real location:",
              pos.coords.latitude,
              pos.coords.longitude,
            );
            console.log("📊 Accuracy:", pos.coords.accuracy, "meters");
            setLocationError(null);
            setReady(true);
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
            enableHighAccuracy: true, // Use GPS if available
            timeout: 10000, // Wait up to 10 seconds
            maximumAge: 300000, // Accept 5-minute-old cached position
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

  // Fetch nearby places when location is available
  useEffect(() => {
    if (!userLocation) return;

    (async () => {
      try {
        const res = await fetch("/api/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }),
        });

        if (!res.ok) throw new Error("Failed to fetch nearby places");

        const results = await res.json();
        setDerivedDisplayedPlaces(results);
      } catch (err) {
        console.error("Failed to load nearby places:", err);
        setLocationError("Failed to load nearby places");
      }
    })();
  }, [userLocation]);

  const searchFormAction = async (formData: FormData) => {
    const query = formData.get("searchQuery") as string;
    if (!query?.trim() || !userLocation) return;

    setIsSearchPending(true);

    try {
      const results = await searchPlaces(query.trim(), userLocation); // Use server action
      console.log(results);
      setDerivedDisplayedPlaces(results);
    } catch (err) {
      console.error("Place search failed:", err);
    } finally {
      setIsSearchPending(false);
    }
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
        derivedDisplayedPlaces,
        isLoadingOverall: !ready,
        searchQuery,
        setSearchQuery,
        isSearchPending,
        searchFormAction,
        locationError,
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
