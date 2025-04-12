"use client";

import { useActionState, useState, useTransition } from "react";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { submitCheckIn } from "@/app/_actions/checkinActions";

type Place = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

export default function Home() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isPendingCheckin, startTransition] = useTransition();

  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // const [state, action, isLoading] = useActionState(submitCheckIn, "");

  const fetchNearbyPlaces = async (lat: number, lon: number) => {
    setIsLoadingPlaces(true);
    setPlacesError(null);
    setNearbyPlaces([]);
    setSelectedPlace(null);
    setCheckinResult(null);
    try {
      const response = await fetch("/api/places/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      if (data.places?.length > 0) setNearbyPlaces(data.places);
      else setPlacesError("No nearby places found.");
    } catch (error: any) {
      console.error("Failed to fetch nearby places:", error);
      setPlacesError(`Failed to fetch places: ${error.message}`);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const handleGetLocation = () => {
    setLocationError(null);
    setLatitude(null);
    setLongitude(null);
    setNearbyPlaces([]);
    setPlacesError(null);
    setSelectedPlace(null);
    setCheckinResult(null);
    setIsLoadingLocation(true);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        setLatitude(lat);
        setLongitude(lon);
        setIsLoadingLocation(false);
        fetchNearbyPlaces(lat, lon);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("User denied the request for Geolocation.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("The request to get user location timed out.");
            break;
          default:
            setLocationError(
              "An unknown error occurred while getting location."
            );
            break;
        }
        console.error("Geolocation Error:", error);
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    setCheckinResult(null);
  };

  const handleCheckIn = () => {
    if (!selectedPlace) return;
    setCheckinResult(null);
    startTransition(async () => {
      const result = await submitCheckIn(selectedPlace);
      setCheckinResult(result);
    });
  };

  return (
    <div className="p-5 font-sans flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex justify-between items-center pb-2 border-b border-gray-300">
        <h1 className="text-xl font-bold">Check In App</h1>
        <nav className="flex gap-2">
          <LoginLink className="px-2 py-1 text-blue-600 hover:underline">
            Sign in
          </LoginLink>
          <LogoutLink className="px-2 py-1 text-red-600 hover:underline">
            Log Out
          </LogoutLink>
        </nav>
      </header>

      <section>
        <button
          onClick={handleGetLocation}
          disabled={isLoadingLocation || isLoadingPlaces}
          className="px-4 py-2 cursor-pointer disabled:opacity-50 bg-blue-500 hover:bg-blue-700 text-white rounded"
        >
          {isLoadingLocation
            ? "Getting Location..."
            : isLoadingPlaces
            ? "Finding Places..."
            : "Find Nearby Places"}
        </button>
        {locationError && <p className="text-red-500 mt-1">{locationError}</p>}
        {latitude && longitude && !locationError && (
          <p className="text-green-500 mt-1">
            Location Found: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        )}
      </section>

      <section>
        {isLoadingPlaces && <p>Loading nearby places...</p>}
        {placesError && <p className="text-orange-500">{placesError}</p>}

        {nearbyPlaces.length > 0 && (
          <div>
            <h3 className="font-semibold">Select a Place to Check In:</h3>
            <form action={submitCheckIn}>
              {nearbyPlaces.map((place) => (
               <label key={place.id} className="block mb-2 cursor-pointer">
               <input
                 type="radio"
                 name="selectedPlaceId" 
                 value={place.id}      
                 onChange={() => handleSelectPlace(place)}
                 className="mr-2"
               />
               <strong className="font-medium text-black">{place.name}</strong>
               <br />
               <small className="text-gray-500 ml-6">{place.address}</small> 
             </label>
           ))}
           <button
              type="submit"
        
              className={`px-4 py-2 rounded text-white font-medium mt-4 ${ /* Your classes */ }`}
            >
              Select Place
            </button>
            </form>
          </div>
        )}
      </section>

      {selectedPlace && (
        <section className="border-t border-gray-300 pt-4">
          <p className="mb-2">
            Selected:{" "}
            <strong className="text-lg font-semibold">
              {selectedPlace.name}
            </strong>
          </p>
          <button
            onClick={handleCheckIn}
            disabled={isPendingCheckin}
            className={`px-4 py-2 rounded text-white font-medium ${
              isPendingCheckin
                ? "bg-gray-500 cursor-wait"
                : "bg-green-500 hover:bg-green-700 cursor-pointer"
            }`}
          >
            {isPendingCheckin ? "Checking In..." : `Confirm Check In`}
          </button>
          {checkinResult && (
            <p
              className={`mt-2 font-bold ${
                checkinResult.success ? "text-green-500" : "text-red-500"
              }`}
            >
              {checkinResult.message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
