"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";

import { Place } from "@/types/places";

interface Location {
  latitude: number;
  longitude: number;
}

interface UserMapProps {
  center: Location;
  places?: Place[];
  zoom?: number;
}

const markerIcon = new L.Icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41], // Standard Leaflet marker size
  iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
  popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
  shadowSize: [41, 41], // Size of the shadow
});

export function UserMap({ center, zoom = 10 }: UserMapProps) {
  const position: LatLngExpression = [center.latitude, center.longitude];

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={position} icon={markerIcon}>
        <Popup>Your current location</Popup>
      </Marker>

      {/* {places &&
        places

          .filter((place) => place.lat != null && place.lng != null)

          .map((place) => {
            const markerPosition: LatLngExpression = [place.lat!, place.lng!];

            return (
              <Marker
                key={place.id}
                position={markerPosition}
                icon={markerIcon}
              >
                <Popup>
                  <b>{place.name}</b>
                  <br />
                  {place.address}
                </Popup>
              </Marker>
            );
          })} */}
    </MapContainer>
  );
}
