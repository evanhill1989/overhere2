// src/app/page.tsx (or your main page file)
"use client";

import { useState, useTransition } from "react";
import {
  RegisterLink, // Assuming RegisterLink is needed, otherwise remove
  LoginLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { submitCheckIn } from "@/app/_actions/checkinActions"; // Import the Server Action

// Define the structure for place data used in this component
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

  // Selected Place state
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Server Action state
  const [isPendingCheckin, startTransition] = useTransition();
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetches places from your API route
  const fetchNearbyPlaces = async (lat: number, lon: number) => {
    setIsLoadingPlaces(true);
    setPlacesError(null);
    setNearbyPlaces([]);
    setSelectedPlace(null);
    setCheckinResult(null);

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
        setPlacesError("No nearby places found.");
      }
    } catch (error: any) {
      console.error("Failed to fetch nearby places:", error);
      setPlacesError(`Failed to fetch places: ${error.message}`);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  // Gets user's current location via browser API
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
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        setIsLoadingLocation(false);
        fetchNearbyPlaces(lat, lon); // Fetch places after getting location
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

  // Handles selecting a place from the list
  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    setCheckinResult(null);
  };

  // Handles submitting the check-in via Server Action
  const handleCheckIn = () => {
    if (!selectedPlace) return;
    setCheckinResult(null);

    startTransition(async () => {
      const result = await submitCheckIn(selectedPlace);
      setCheckinResult(result);
      // Optionally reset selection on success
      // if (result.success) {
      //   setSelectedPlace(null);
      // }
    });
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        maxWidth: "600px",
        margin: "auto",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "10px",
          borderBottom: "1px solid #eee",
        }}
      >
        <h1>Check In App</h1>
        <nav style={{ display: "flex", gap: "10px" }}>
          <LoginLink>Sign in</LoginLink>
          {/* <RegisterLink>Sign up</RegisterLink> */}
          <LogoutLink>Log Out</LogoutLink>
        </nav>
      </header>

      <section>
        <button
          onClick={handleGetLocation}
          disabled={isLoadingLocation || isLoadingPlaces}
          style={{ padding: "10px 15px", cursor: "pointer" }}
        >
          {isLoadingLocation
            ? "Getting Location..."
            : isLoadingPlaces
            ? "Finding Places..."
            : "Find Nearby Places"}
        </button>
        {locationError && (
          <p style={{ color: "red", marginTop: "5px" }}>{locationError}</p>
        )}
        {latitude && longitude && !locationError && (
          <p style={{ color: "green", marginTop: "5px" }}>
            Location Found: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        )}
      </section>

      <section>
        {isLoadingPlaces && <p>Loading nearby places...</p>}
        {placesError && <p style={{ color: "orange" }}>{placesError}</p>}

        {nearbyPlaces.length > 0 && (
          <div>
            <h3>Select a Place to Check In:</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {nearbyPlaces.map((place) => (
                <li key={place.id} style={{ marginBottom: "8px" }}>
                  <button
                    onClick={() => handleSelectPlace(place)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background:
                        selectedPlace?.id === place.id ? "#e0f7fa" : "#f9f9f9",
                      border:
                        selectedPlace?.id === place.id
                          ? "2px solid #007bff"
                          : "1px solid #ddd",
                      padding: "10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <strong>{place.name}</strong>
                    <br />
                    <small style={{ color: "#555" }}>{place.address}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {selectedPlace && (
        <section style={{ borderTop: "1px solid #eee", paddingTop: "15px" }}>
          <p style={{ margin: "0 0 10px 0" }}>
            Selected:{" "}
            <strong style={{ fontSize: "1.1em" }}>{selectedPlace.name}</strong>
          </p>
          <button
            onClick={handleCheckIn}
            disabled={isPendingCheckin}
            style={{
              padding: "10px 15px",
              background: isPendingCheckin ? "grey" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isPendingCheckin ? "wait" : "pointer",
              fontSize: "1em",
            }}
          >
            {isPendingCheckin ? "Checking In..." : `Confirm Check In`}
          </button>
          {checkinResult && (
            <p
              style={{
                color: checkinResult.success ? "green" : "red",
                marginTop: "10px",
                fontWeight: "bold",
              }}
            >
              {checkinResult.message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
