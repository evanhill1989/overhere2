import { useState, useEffect, useCallback } from "react";
import type { LocationData } from "./useGeolocation"; // Import type

// Assuming Place type is defined elsewhere or define here
export type Place = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

export function useNearbyPlaces(location: LocationData | null) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchPlaces = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);
    setPlaces([]); // Reset places on new fetch

    try {
      const response = await fetch("/api/places/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || `HTTP error! status: ${response.status}`);

      if (data.places?.length > 0) {
        setPlaces(data.places);
      } else {
        setError("No nearby places found.");
      }
    } catch (fetchError: any) {
      console.error("Failed to fetch nearby places:", fetchError);
      setError(`Failed to fetch places: ${fetchError.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback ensures stable identity

  useEffect(() => {
    if (location) {
      fetchPlaces(location.latitude, location.longitude);
    } else {
      // Optionally clear places if location becomes null
      setPlaces([]);
      setError(null);
      setIsLoading(false);
    }
  }, [location, fetchPlaces]); // Depend on location and the stable fetchPlaces function

  return {
    places,
    error,
    isLoading,
    refetch: () =>
      location && fetchPlaces(location.latitude, location.longitude),
  };
}
