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
    console.log(userLocation, "@@@@<<<<<<<<-------userLocation in useEffect");
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
        console.log(
          results,
          "<<<<<<<<<<<<<<<<--------------results from nearby api fetch ",
        );
        setDerivedDisplayedPlaces(results);
      } catch (err) {
        console.error("Failed to load nearby places:", err);
        // Optional: Fallback UI or toast
      }
    })();
  }, [userLocation]);

  // [
  //     {
  //       place_id: "abc123",
  //       name: "Nearby Coffee",
  //       address: "123 Main St",
  //     },
  //     {
  //       place_id: "xyz789",
  //       name: "Local Park",
  //       address: "456 Park Ave",
  //     },
  //     { place_id: "uti456", name: "Pizza", address: "456 Park Ave" },
  //     { place_id: "fbi666", name: "Library", address: "456 Park Ave" },
  //     { place_id: "cia911", name: "Speakeasy", address: "456 Park Ave" },
  //     { place_id: "qwe482", name: "Bluebird Café", address: "102 Elm St" },
  //     { place_id: "lmn673", name: "Neon Diner", address: "310 Sunset Blvd" },
  //     { place_id: "zxc384", name: "The Nook", address: "87 Maple Dr" },
  //     { place_id: "vbn562", name: "Lucky's", address: "220 Birch Ln" },
  //     { place_id: "jkl915", name: "Civic Lounge", address: "14 Grant Way" },
  //     { place_id: "tyu327", name: "Hideout", address: "690 Oak Hill Rd" },
  //     { place_id: "asd745", name: "Vinyl Room", address: "99 Beacon St" },
  //     { place_id: "fgh896", name: "Third Rail", address: "12 Industrial Pkwy" },
  //     { place_id: "bnm563", name: "Moonshot", address: "321 Riverside Ave" },
  //     { place_id: "wer384", name: "Gallery Taproom", address: "75 5th Ave" },
  //     { place_id: "poi665", name: "Firefly Bar", address: "448 Juniper Ln" },
  //     { place_id: "uio774", name: "The Still", address: "58 Monroe Pl" },
  //     { place_id: "hjk558", name: "Copper Hall", address: "17 Ash Ct" },
  //     { place_id: "mnb987", name: "Driftwood", address: "639 Ocean View Dr" },
  //     { place_id: "yui340", name: "The Pressroom", address: "84 Library St" },
  //     { place_id: "opq771", name: "Lantern", address: "412 Spruce Way" },
  //     { place_id: "cde342", name: "Back Bar", address: "235 Canal St" },
  //     { place_id: "rtz661", name: "Rose & Crown", address: "138 Cedar Ave" },
  //     { place_id: "plm489", name: "Studio 89", address: "902 Vine Rd" },
  //     {
  //       place_id: "ghj726",
  //       name: "Cork & Flame",
  //       address: "67 Peachtree Blvd",
  //     },
  //   ]

  const searchFormAction = async (formData: FormData) => {
    const query = formData.get("searchQuery") as string;
    if (!query?.trim() || !userLocation) return;
    setIsSearchPending(true);

    try {
      const results = await searchGooglePlaces(query.trim(), userLocation);
      console.log(results);
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
