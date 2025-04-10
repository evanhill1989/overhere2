"use client";

import { useState, useTransition } from "react"; // Import useEffect
import { createUser } from "@/db/queries/insert";
import {
  RegisterLink,
  LoginLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { submitCheckIn } from "@/app/_actions/checkinActions";

// Define a type for the place data structure
interface Place {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

export default function Home() {
  // Geolocation state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  // Nearby Places state
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Selected Place state (for check-in)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // --- State for Server Action ---
  const [isPending, startTransition] = useTransition(); // For loading state during action
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null); // To show success/error message

  // --- Fetch Nearby Places Function ---
  const fetchNearbyPlaces = async (lat: number, lon: number) => {
    setIsLoadingPlaces(true);
    setPlacesError(null);
    setNearbyPlaces([]); // Clear previous places
    setSelectedPlace(null); // Clear selected place

    try {
      const response = await fetch("/api/places/nearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.places && data.places.length > 0) {
        setNearbyPlaces(data.places);
      } else {
        setPlacesError("No nearby places found."); // Or just show nothing
      }
    } catch (error: any) {
      console.error("Failed to fetch nearby places:", error);
      setPlacesError(`Failed to fetch places: ${error.message}`);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  // --- Get Location Handler ---
  const handleGetLocation = () => {
    // Reset states
    setLocationError(null);
    setLatitude(null);
    setLongitude(null);
    setNearbyPlaces([]);
    setPlacesError(null);
    setSelectedPlace(null);
    setIsLoadingLocation(true);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        setIsLoadingLocation(false);
        console.log("Location obtained:", position.coords);

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
    console.log("Selected place:", place);
  };

  // --- Handle Actual Check-in using Server Action ---
  const handleCheckIn = async () => {
    if (!selectedPlace) {
      alert("Please select a place first!");
      return;
    }
    setCheckinResult(null); // Clear previous results

    // Wrap the Server Action call in startTransition
    startTransition(async () => {
      const result = await submitCheckIn(selectedPlace); // Call the server action
      setCheckinResult(result); // Store the result message

      if (result.success) {
        console.log("Check-in successful via Server Action:", result.message);
        // Optionally clear selection or give other feedback
        // setSelectedPlace(null);
      } else {
        console.error("Check-in failed via Server Action:", result.message);
      }
    });
  };

  const handleAddUser = async () => {
    /* ... as before ... */
  };

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}
    >
      {/* ... (Title, Auth Links, Location Button, Location Info) ... */}
      <h1>Homepage - Check In</h1>
      <div>
        <LoginLink style={{ marginRight: "10px" }}>Sign in</LoginLink>
        <LogoutLink>Log Out</LogoutLink>
      </div>
      <hr />
      <button onClick={handleGetLocation} disabled={isLoadingLocation}>
        {isLoadingLocation ? "Getting Location..." : "Find Nearby Places"}
      </button>
      {/* ... Location error/info display ... */}
      <hr />

      {/* --- Nearby Places Section (as before) --- */}
      {isLoadingPlaces && <p>Loading nearby places...</p>}
      {placesError && (
        <p style={{ color: "orange" }}>Places Error: {placesError}</p>
      )}
      {nearbyPlaces.length > 0 && (
        <div>
          <h3>Select a Place to Check In:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {nearbyPlaces.map((place) => (
              <li
                key={place.id}
                style={{
                  /* ... styling ... */ border:
                    selectedPlace?.id === place.id
                      ? "2px solid blue"
                      : "1px solid #ccc" /* ... */,
                }}
              >
                <button
                  onClick={() => handleSelectPlace(place)}
                  style={
                    {
                      /* ... styling ... */
                    }
                  }
                >
                  <strong>{place.name}</strong>
                  <br />
                  <small>{place.address}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Check-in Action --- */}
      {selectedPlace && (
        <div>
          <hr />
          <p>
            Selected: <strong>{selectedPlace.name}</strong>
          </p>
          <button
            onClick={handleCheckIn}
            disabled={isPending} // Disable button while action is running
            style={{
              padding: "10px",
              background: isPending ? "grey" : "green",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isPending ? "wait" : "pointer",
            }}
          >
            {isPending
              ? "Checking In..."
              : `Confirm Check In at ${selectedPlace.name}`}
          </button>
          {/* Display result from Server Action */}
          {checkinResult && (
            <p
              style={{
                color: checkinResult.success ? "green" : "red",
                marginTop: "10px",
              }}
            >
              {checkinResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
