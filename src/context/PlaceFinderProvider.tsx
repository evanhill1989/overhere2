// context/PlaceFinderProvider.tsx

"use client";

import { useState, useEffect, useRef, useContext, createContext } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Place } from "@/lib/types/places";

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
            setUserLocation(pos.coords);
            setReady(true);
          },
          () => {
            router.replace("/explain-location");
          },
        );
      } else {
        router.replace("/about");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!userLocation) return;

    setDerivedDisplayedPlaces([
      {
        place_id: "abc123",
        name: "Nearby Coffee",
        address: "123 Main St",
      },
      {
        place_id: "xyz789",
        name: "Local Park",
        address: "456 Park Ave",
      },
    ]);
  }, [userLocation]);

  const searchFormAction = async (formData: FormData) => {
    const query = formData.get("searchQuery") as string;
    setIsSearchPending(true);
    // TODO: Implement real search call
    await new Promise((r) => setTimeout(r, 1000));
    setDerivedDisplayedPlaces([
      {
        place_id: "search456",
        name: `Search Result for "${query}"`,
        address: "789 Example Rd",
      },
    ]);
    setIsSearchPending(false);
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
