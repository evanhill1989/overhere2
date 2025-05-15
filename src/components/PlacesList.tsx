"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { CheckInDialog } from "./CheckInDialog";

import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";
interface PlacesListProps {
  displayedPlaces: Place[];
  currentUserLocation: LocationData | null;
}

export default function PlacesList({
  displayedPlaces,
  currentUserLocation,
}: PlacesListProps) {
  const container = useRef<HTMLDivElement>(null);
  //   const onClickBox = useRef<HTMLDivElement>(null);
  //   const onLoadBox = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".onLoadBox",
        { rotation: 0 },
        { rotation: 360, duration: 1, stagger: 0.1, ease: "power1.inOut" },
      );
    },
    { scope: container, dependencies: [displayedPlaces] },
  );

  const { contextSafe } = useGSAP({ scope: container });

  const onClickGood = contextSafe((event: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(event.currentTarget, {
      rotation: "+=360",
      duration: 0.5,
      ease: "power1.out",
      overwrite: "auto",
    });
  });

  return (
    <>
      <div ref={container}>
        <ul className="space-y-1 pb-2">
          {displayedPlaces.map((place) => (
            <li className="flex" key={place.id}>
              <CheckInDialog
                place={place}
                currentUserLocation={currentUserLocation}
              />
              <div className="onLoadBox h-5 w-8 bg-amber-500"></div>
              <div
                className="box h-5 w-8 bg-green-600"
                onClick={onClickGood}
              ></div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
