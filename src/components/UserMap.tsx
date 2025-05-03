// src/components/UserMap.tsx
"use client"; // Essential for hooks and Leaflet interaction

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS
import L, { type LatLngExpression } from "leaflet"; // Import Leaflet library and types
import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";

// --- Define Component Props ---
export interface UserMapProps {
  /** Array of places to display markers for */
  places: Place[];
  /** Current user's location, if available */
  userLocation: LocationData | null;
  /** The currently selected place, if any */
  selectedPlace?: Place | null; // Optional selected place
  /** Optional initial center override (less common now with dynamic centering) */
  center?: LocationData;
  /** Optional initial zoom override */
  zoom?: number;
}

// --- Helper Component: Dynamically Update Map View ---
// This component listens to center/zoom prop changes and tells the map instance to update.
function ChangeView({
  center,
  zoom,
  animate = true,
}: {
  center: L.LatLngExpression;
  zoom: number;
  animate?: boolean;
}) {
  const map = useMap(); // Hook to get the map instance
  useEffect(() => {
    // setView pans and zooms the map smoothly
    map.setView(center, zoom, { animate });
  }, [map, center, zoom, animate]); // Re-run effect if these change
  return null; // This component doesn't render anything itself
}

// --- Configure Leaflet Icons (Optional but Recommended) ---
// Delete default icon behavior which can cause issues with bundlers like Webpack

// Define custom icons (ensure the image paths are correct relative to your public folder)
const defaultIcon = L.icon({
  iconUrl: "marker-icon.png", // Path to default marker icon
  iconRetinaUrl: "marker-icon-2x.png", // Path to retina marker icon
  shadowUrl: "marker-shadow.png", // Path to marker shadow
  iconSize: [25, 41], // Size of the icon
  iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
  popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
  shadowSize: [41, 41], // Size of the shadow
});

const selectedIcon = L.icon({
  iconUrl: "marker-icon.png", // Path to default marker icon
  iconRetinaUrl: "marker-icon-2x.png", // Path to retina marker icon
  shadowUrl: "marker-shadow.png", // Path to marker shadow
  iconSize: [30, 49], // Slightly larger?
  iconAnchor: [15, 49],
  popupAnchor: [1, -38],
  shadowSize: [49, 49],
});

const userIcon = L.icon({
  iconUrl: "person.svg", // DIFFERENT icon for user location
  // iconRetinaUrl: "/leaflet/marker-icon-user-2x.png",
  // shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
// --- End Icon Configuration ---

// --- Main Map Component ---
export function UserMap({
  places,
  userLocation,
  selectedPlace,
  center: initialCenter, // Destructure optional 'center' prop, rename it
  zoom: initialZoom = 15, // Default zoom if none derived
}: UserMapProps) {
  // --- Safely Determine Map Center and Zoom ---
  let mapCenter: LatLngExpression; // Use Leaflet's LatLngExpression type
  let mapZoom = initialZoom;

  if (selectedPlace?.lat && selectedPlace?.lng) {
    // 1. Priority: Center on the selected place if available
    mapCenter = [selectedPlace.lat, selectedPlace.lng];
    mapZoom = 17; // Zoom in closer on selected place
  } else if (userLocation) {
    // 2. Priority: Center on the user's location if available
    mapCenter = [userLocation.latitude, userLocation.longitude];
    // mapZoom remains initialZoom or you can set a specific one e.g., 16
  } else if (initialCenter) {
    // 3. Priority: Use the optional center prop passed by the parent
    mapCenter = [initialCenter.latitude, initialCenter.longitude];
  } else {
    // 4. Fallback: Default location (St. Petersburg, FL - as per current context)
    mapCenter = [27.7677, -82.6427];
    mapZoom = 13; // Zoom out for a wider default view
  }
  // --- End Safe Center Determination ---

  // Basic check to prevent errors during potential SSR attempts if dynamic import fails
  if (typeof window === "undefined") {
    return (
      <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground">
        Loading map...
      </div>
    );
  }

  return (
    <MapContainer
      key={JSON.stringify(mapCenter)} // Optional: Force re-render on center change if ChangeView isn't enough
      center={mapCenter} // Use the derived center
      zoom={mapZoom} // Use the derived zoom
      scrollWheelZoom={true} // Enable/disable zoom on scroll
      style={{ height: "100%", width: "100%", minHeight: "200px" }} // Ensure container has dimensions
      // className="z-0" // Set z-index if needed for overlays
    >
      {/* Base Map Tile Layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marker for User's Current Location */}
      {userLocation && (
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userIcon} // Use custom user icon
          zIndexOffset={100} // Ensure user marker is potentially above others
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {/* Markers for Searched/Nearby Places */}
      {places.map((place) => {
        // Skip rendering if coordinates are missing
        if (place.lat == null || place.lng == null) {
          console.warn(
            `Skipping place due to missing coordinates: ${place.name}`
          );
          return null;
        }
        const isSelected = selectedPlace?.id === place.id;
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={isSelected ? selectedIcon : defaultIcon} // Use different icon if selected
            // Example: Adjust z-index to bring selected marker to front
            zIndexOffset={isSelected ? 200 : 0}
            // Example: Adjust opacity
            // opacity={isSelected ? 1.0 : 0.8}
          >
            <Popup>
              <div className="font-semibold">{place.name}</div>
              <div>{place.address}</div>
              {/* You could add a button here to trigger check-in form */}
              {/* <button onClick={() => onSelectPlaceFromMap?.(place)}>Select</button> */}
            </Popup>
          </Marker>
        );
      })}

      {/* This component handles map.setView calls when center/zoom props change */}
      <ChangeView center={mapCenter} zoom={mapZoom} />
    </MapContainer>
  );
}

// Default export is common practice
export default UserMap;
