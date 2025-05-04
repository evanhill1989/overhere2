// src/components/UserMap.tsx
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // Ensure Leaflet CSS is imported
import type { LatLngExpression } from "leaflet"; // Import Leaflet types
import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";

// Props interface for the UserMap component
export interface UserMapProps {
  places: Place[];
  userLocation: LocationData | null;
  selectedPlace?: Place | null;
  center?: LocationData;
  zoom?: number;
}

// Helper component to dynamically update map view
function ChangeView({
  center,
  zoom,
  animate = true,
}: {
  center: LatLngExpression;
  zoom: number;
  animate?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate });
  }, [map, center, zoom, animate]);
  return null;
}

// Main Map Component - Uses Leaflet's default icons
export default function UserMap({
  places,
  userLocation,
  selectedPlace,
  center: initialCenter,
  zoom: initialZoom = 15, // Default zoom
}: UserMapProps) {
  // Determine map center based on available data
  let mapCenter: LatLngExpression;
  let mapZoom = initialZoom;

  if (selectedPlace?.lat != null && selectedPlace?.lng != null) {
    mapCenter = [selectedPlace.lat, selectedPlace.lng];
    mapZoom = 17; // Zoom in on selected place
  } else if (userLocation) {
    mapCenter = [userLocation.latitude, userLocation.longitude];
  } else if (initialCenter) {
    mapCenter = [initialCenter.latitude, initialCenter.longitude];
  } else {
    mapCenter = [27.7677, -82.6427]; // Fallback center (St. Petersburg, FL)
    mapZoom = 13;
  }

  return (
    <MapContainer
      // Using key might help if MapContainer itself needs to re-render fully on center change
      key={JSON.stringify(mapCenter)}
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
      dragging={true}
      zoomControl={true} // Ensure zoom controls are enabled
      style={{ height: "100%", width: "100%", minHeight: "200px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User Marker (uses default icon) */}
      {userLocation && (
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          zIndexOffset={100} // Keep potentially useful zIndex
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {/* Place Markers (uses default icon) */}
      {places.map((place) => {
        // Skip rendering if coordinates are invalid
        if (place.lat == null || place.lng == null) {
          return null;
        }
        const isSelected = selectedPlace?.id === place.id;
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            // No 'icon' prop needed - uses Leaflet default
            zIndexOffset={isSelected ? 200 : 0} // Still useful for selected state
            opacity={isSelected ? 1.0 : 0.8} // Example style for selected state
          >
            <Popup>
              <div className="font-semibold">{place.name}</div>
              <div>{place.address}</div>
            </Popup>
          </Marker>
        );
      })}

      {/* Component to handle view changes */}
      <ChangeView center={mapCenter} zoom={mapZoom} />
    </MapContainer>
  );
}

// Export component - assuming default export based on dynamic import usage
