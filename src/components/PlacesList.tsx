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
  const onClickBox = useRef<HTMLDivElement>(null);
  //   const onLoadBox = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(".onLoadBox", { rotation: 360, duration: 1 });

      const onClickBoxAnimate = () => gsap.to(".onClickBox", { rotation: 360 });
      const currentOnClickBoxTarget = onClickBox.current;
      currentOnClickBoxTarget?.addEventListener("click", onClickBoxAnimate);

      //   const currentOnClickBoxTarget = onClickBox.current;
      //   if (currentOnClickBoxTarget) {
      //     onClickBox.current.addEventListener("click", onClickBoxAnimate);
      //     console.log("context", context);
      //     return () => {
      //       currentOnClickBoxTarget.removeEventListener(
      //         "click",
      //         onClickBoxAnimate,
      //       );
      //     };
      //   }
    },
    { scope: container },
  );
  //   const box = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: container });
  const onClickGood = contextSafe(() => {
    gsap.to(".box", { rotation: 360 });
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
