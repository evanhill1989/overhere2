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
} from "react-leaflet"; // Added Tooltip
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression } from "leaflet";
import ReactDOMServer from "react-dom/server";
import { UserCircle, MapPin } from "@phosphor-icons/react/dist/ssr";
import type { Place } from "@/lib/types/places";

import { usePlaceFinder } from "@/providers/PlaceFinderProvider";
import { LocationData } from "@/lib/types/location";

export interface UserMapProps {
  places: Place[];
  selectedPlace?: Place | null; // For visual feedback on map (e.g., different icon)
  onPlaceMarkerClick?: (place: Place) => void; // Callback for marker click
  center?: LocationData;
  zoom?: number;
}

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

  if (selectedPlace?.lat != null && selectedPlace?.lng != null) {
    mapCenter = [selectedPlace.lat, selectedPlace.lng];
    mapZoom = 17;
  } else if (userLocation) {
    mapCenter = [userLocation.latitude, userLocation.longitude];
  } else if (initialCenter) {
    mapCenter = [initialCenter.latitude, initialCenter.longitude];
  } else {
    mapCenter = [27.7677, -82.6427];
    mapZoom = 13;
  }

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
      {userLocation && (
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userLocationIcon}
          zIndexOffset={200}
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}
      {places.map((place) => {
        if (place.lat == null || place.lng == null) return null;
        const isCurrentlySelected = selectedPlace?.place_id === place.place_id;
        return (
          <Marker
            key={place.place_id}
            position={[place.lat, place.lng]}
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
              <div>{place.address}</div>
            </Tooltip>
          </Marker>
        );
      })}
      <ChangeView center={mapCenter} zoom={mapZoom} />
    </MapContainer>
  );
}
