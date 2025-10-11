// src/components/UserMap.tsx
"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression } from "leaflet";
import ReactDOMServer from "react-dom/server";
import { UserCircle, MapPin } from "@phosphor-icons/react/dist/ssr";

// ✅ Import canonical types
import type { Place } from "@/lib/types/database";
import { usePlaceFinder } from "@/providers/PlaceFinderProvider";
import { type Coords } from "@/lib/types/core";

export interface UserMapProps {
  places: Place[]; // ✅ Use canonical Place type
  selectedPlace?: Place | null; // ✅ Use canonical Place type
  onPlaceMarkerClick?: (place: Place) => void; // ✅ Use canonical Place type
  center?: Coords; // ✅ Use branded Coords type
  zoom?: number;
}

// Icon definitions (unchanged)
const userIconHTML = ReactDOMServer.renderToStaticMarkup(
  <UserCircle size={28} weight="fill" className="text-blue-600" />,
);
const userLocationIcon = L.divIcon({
  html: userIconHTML,
  className: "custom-leaflet-div-icon",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const placeIconHTML = ReactDOMServer.renderToStaticMarkup(
  <MapPin size={28} weight="fill" className="text-slate-700" />,
);
const placeMarkerIcon = L.divIcon({
  html: placeIconHTML,
  className: "custom-leaflet-div-icon",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const selectedPlaceIconHTML = ReactDOMServer.renderToStaticMarkup(
  <MapPin size={32} weight="fill" className="text-red-600" />,
);
const selectedPlaceMarkerIcon = L.divIcon({
  html: selectedPlaceIconHTML,
  className: "custom-leaflet-div-icon",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

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

export default function UserMap({
  places,
  selectedPlace,
  onPlaceMarkerClick,
  center: initialCenter,
  zoom: initialZoom = 15,
}: UserMapProps) {
  const { userLocation } = usePlaceFinder();

  let mapCenter: LatLngExpression;
  let mapZoom = initialZoom;

  // ✅ Updated to use canonical Place structure
  if (selectedPlace?.latitude != null && selectedPlace?.longitude != null) {
    mapCenter = [selectedPlace.latitude, selectedPlace.longitude];
    mapZoom = 17;
  } else if (userLocation) {
    mapCenter = [userLocation.latitude, userLocation.longitude];
  } else if (initialCenter) {
    mapCenter = [initialCenter.latitude, initialCenter.longitude];
  } else {
    // Default to St. Petersburg, Florida (your user location from search_instructions)
    mapCenter = [27.7677, -82.6427];
    mapZoom = 13;
  }

  // ✅ DEBUG: Log the places being passed to the map
  console.log("🗺️ UserMap received places:", places.length);
  console.log("🗺️ First place:", places[0]);
  console.log("🗺️ Selected place:", selectedPlace);

  return (
    <MapContainer
      key={JSON.stringify(mapCenter) + initialZoom}
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
      dragging={true}
      zoomControl={true}
      style={{ height: "100%", width: "100%", minHeight: "200px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location marker */}
      {userLocation && (
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userLocationIcon}
          zIndexOffset={200}
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {/* Place markers */}
      {places.map((place) => {
        // ✅ Updated to use canonical Place structure
        if (place.latitude == null || place.longitude == null) {
          console.warn("⚠️ Skipping place without coordinates:", place.name);
          return null;
        }

        // ✅ Updated comparison to use canonical id
        const isCurrentlySelected = selectedPlace?.id === place.id;

        // ✅ DEBUG: Log each place being rendered
        console.log(`🗺️ Rendering place marker:`, {
          id: place.id,
          name: place.name,
          lat: place.latitude,
          lng: place.longitude,
          selected: isCurrentlySelected,
        });

        return (
          <Marker
            key={place.id} // ✅ Use canonical id
            position={[place.latitude, place.longitude]} // ✅ Use canonical coordinates
            icon={
              isCurrentlySelected ? selectedPlaceMarkerIcon : placeMarkerIcon
            }
            zIndexOffset={isCurrentlySelected ? 150 : 100}
            opacity={isCurrentlySelected ? 1.0 : 0.85}
            eventHandlers={{
              click: () => {
                if (onPlaceMarkerClick) {
                  onPlaceMarkerClick(place);
                }
              },
            }}
          >
            <Tooltip sticky>
              <div className="font-semibold">{place.name}</div>
              <div>{place.address}</div> {/* ✅ Use canonical address */}
            </Tooltip>
          </Marker>
        );
      })}

      <ChangeView center={mapCenter} zoom={mapZoom} />
    </MapContainer>
  );
}
