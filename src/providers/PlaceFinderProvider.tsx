// src/providers/PlaceFinderProvider.tsx
"use client";

import {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { Coords, coordsSchema } from "@/lib/types/core";

const LOCATION_PRIMER_KEY = "overhere_location_primer_seen";

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
  const mountedRef = useRef(true);

  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [ready, setReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isInSearchMode, setIsInSearchMode] = useState(false);
  const [showLocationPrimer, setShowLocationPrimer] = useState(false);

  const locationRequestedRef = useRef(false);

  // Track unmount to avoid state updates on unmounted component
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleLocationSuccess = useCallback((pos: GeolocationPosition) => {
    if (!mountedRef.current) return;

    const rawLocationData = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };

    try {
      const brandedLocationData: Coords = coordsSchema.parse(rawLocationData);
      setUserLocation(brandedLocationData);
      console.log(
        "📍 Real location:",
        pos.coords.latitude,
        pos.coords.longitude,
      );
      setLocationError(null);
      setReady(true);
    } catch (e) {
      console.error("❌ Failed to parse/brand location data:", e);
      setLocationError("Failed to validate location coordinates.");
      setReady(false);
    }
  }, []);

  const handleLocationError = useCallback(
    (error: GeolocationPositionError) => {
      if (!mountedRef.current) return;

      console.error("❌ Location error:", {
        code: error.code,
        message: error.message,
        PERMISSION_DENIED: error.PERMISSION_DENIED,
        POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
        TIMEOUT: error.TIMEOUT,
      });

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
    [router],
  );

  const doRequestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("❌ Geolocation is not supported by this browser");
      setLocationError("Geolocation is not supported by your browser.");
      setReady(false);
      return;
    }

    console.log("📍 Requesting geolocation...");
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, [handleLocationSuccess, handleLocationError]);

  // Auth state → primer check → geolocation request
  useEffect(() => {
    const client = supabase.current;
    let isSubscribed = true;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Auth state change:", event, "Has user:", !!session?.user);

      if (session?.user && isSubscribed && !locationRequestedRef.current) {
        const hasSeen = localStorage.getItem(LOCATION_PRIMER_KEY);

        if (!hasSeen) {
          // First-time user: show explainer before the browser dialog fires
          setShowLocationPrimer(true);
          // locationRequestedRef stays false — primer accept will trigger the request
        } else {
          // Returning user: go straight to geolocation (existing behavior)
          locationRequestedRef.current = true;
          doRequestGeolocation();
        }
      } else if (!session?.user) {
        setReady(false);
        setUserLocation(null);
        setShowLocationPrimer(false);
        locationRequestedRef.current = false;
      }
    });

    return () => {
      isSubscribed = false;
      locationRequestedRef.current = false;
      subscription.unsubscribe();
    };
  }, [router, doRequestGeolocation]);

  const handlePrimerAccept = () => {
    localStorage.setItem(LOCATION_PRIMER_KEY, "true");
    setShowLocationPrimer(false);
    locationRequestedRef.current = true;
    doRequestGeolocation();
  };

  const searchFormAction = (formData: FormData) => {
    const query = formData.get("searchQuery") as string;

    if (!query?.trim()) {
      clearSearch();
      return;
    }

    setIsInSearchMode(true);
    setSearchQuery(query.trim());
  };

  const clearSearch = () => {
    setIsInSearchMode(false);
    setSearchQuery("");
  };

  // --- Render gates (in priority order) ---

  if (showLocationPrimer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-2xl font-bold">One thing first</h1>
        <p className="text-muted-foreground max-w-sm">
          If you can&apos;t prove you&apos;re physically at a location, you
          can&apos;t message people who are physically at the location. Allow
          location permissions when prompted to see who else is ready to say
          hello.
        </p>
        <button
          onClick={handlePrimerAccept}
          className="bg-primary text-primary-foreground rounded-md px-6 py-3 font-medium"
        >
          Got it — enable my location
        </button>
      </div>
    );
  }

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
