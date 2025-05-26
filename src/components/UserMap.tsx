// src/components/UserMap.tsx
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // Ensure Leaflet CSS is imported
import type { LatLngExpression } from "leaflet"; // Import Leaflet types
import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";
import L from "leaflet";
import { UserCircle, MapPin } from "@phosphor-icons/react/dist/ssr";
import ReactDOMServer from "react-dom/server";

// Props interface for the UserMap component
export interface UserMapProps {
  places: Place[];
  userLocation: LocationData | null;
  selectedPlace?: Place | null;
  center?: LocationData;
  zoom?: number;
}

// User Location Icon
const userIconHTML = ReactDOMServer.renderToStaticMarkup(
  <UserCircle size={28} weight="fill" className="text-blue-600" />,
);
const userLocationIcon = L.divIcon({
  html: userIconHTML,
  className: "custom-leaflet-div-icon", // Important: for removing default Leaflet divIcon styling
  iconSize: [28, 28],
  iconAnchor: [14, 28], // Anchor at bottom-center for a "person" icon
  popupAnchor: [0, -28],
});

// Place Icon
const placeIconHTML = ReactDOMServer.renderToStaticMarkup(
  <MapPin size={28} weight="fill" className="text-slate-700" />, // Example, use any Phosphor icon
);
const placeMarkerIcon = L.divIcon({
  html: placeIconHTML,
  className: "custom-leaflet-div-icon",
  iconSize: [28, 28],
  iconAnchor: [14, 28], // Anchor at bottom-center for pin-like icons
  popupAnchor: [0, -28],
});

// Selected Place Icon (optional, if you want a different style for selected)
const selectedPlaceIconHTML = ReactDOMServer.renderToStaticMarkup(
  <MapPin size={32} weight="fill" className="text-red-600" />, // Larger and different color
);
const selectedPlaceMarkerIcon = L.divIcon({
  html: selectedPlaceIconHTML,
  className: "custom-leaflet-div-icon",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

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
      // className="dark:bg-background h-full w-full bg-white shadow-md"
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
          icon={userLocationIcon}
          zIndexOffset={200}
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}
      {/* Place Markers (uses default icon) */}
      {places.map((place) => {
        if (place.lat == null || place.lng == null) {
          return null;
        }
        const isSelected = selectedPlace?.id === place.id;
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={isSelected ? selectedPlaceMarkerIcon : placeMarkerIcon}
            zIndexOffset={isSelected ? 150 : 100}
            opacity={isSelected ? 1.0 : 0.85}
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
