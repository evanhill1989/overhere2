import { useState, useCallback } from "react";

export type LocationData = {
  latitude: number;
  longitude: number;
};

export function useGeolocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const requestLocation = useCallback(() => {
    setError(null);
    setLocation(null); // Reset location on new request
    setIsLoading(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setIsLoading(false);
      },
      (geoError) => {
        let message = "An unknown error occurred while getting location.";
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message = "User denied the request for Geolocation.";
            break;
          case geoError.POSITION_UNAVAILABLE:
            message = "Location information is unavailable.";
            break;
          case geoError.TIMEOUT:
            message = "The request to get user location timed out.";
            break;
        }
        setError(message);
        console.error("Geolocation Error:", geoError);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []); // useCallback ensures this function has a stable identity

  return { location, error, isLoading, requestLocation };
}
