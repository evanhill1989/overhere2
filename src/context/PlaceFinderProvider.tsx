// context/PlaceFinderProvider.tsx

"use client";

import { useState, useEffect, useRef, useContext, createContext } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Place } from "@/lib/types/places";
import { searchGooglePlaces } from "@/lib/api/googlePlaces";

type PlaceFinderContextType = {
  userLocation: GeolocationCoordinates;
  derivedDisplayedPlaces: Place[];
  isLoadingOverall: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isSearchPending: boolean;
  searchFormAction: (formData: FormData) => void;
};

const PlaceFinderContext = createContext<PlaceFinderContextType | null>(null);

export function PlaceFinderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useRef(createClient());
  const router = useRouter();

  const [userLocation, setUserLocation] =
    useState<GeolocationCoordinates | null>(null);
  const [derivedDisplayedPlaces, setDerivedDisplayedPlaces] = useState<Place[]>(
    [],
  );
  const [ready, setReady] = useState(false);
  const [isSearchPending, setIsSearchPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const client = supabase.current;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const mockCoords = {
              ...pos.coords,
              latitude: 27.77022,
              longitude: -82.63646,
            };

            setUserLocation(mockCoords);
            console.log(pos.coords.latitude, "position coordinates");
            setReady(true);
          },
          () => {
            router.replace("/explain-location");
          },
        );
      } else {
        // Don't touch `ready`, just let the app decide what to render
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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
        if (!res.ok) throw new Error("Failed to fetch");
        const results = await res.json();
        setDerivedDisplayedPlaces(results);
      } catch (err) {
        console.error("Failed to load nearby places:", err);
        // Optional: Fallback UI or toast
      }
    })();
  }, [userLocation]);

  const searchFormAction = async (formData: FormData) => {
    const query = formData.get("searchQuery") as string;
    if (!query?.trim() || !userLocation) return;
    setIsSearchPending(true);

    try {
      const results = await searchGooglePlaces(query.trim(), userLocation);
      setDerivedDisplayedPlaces(results);
    } catch (err) {
      console.error("Place search failed:", err);
      // Optional: Show toast via sonner
    } finally {
      setIsSearchPending(false);
    }
  };
  if (!ready || !userLocation) return null;

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
