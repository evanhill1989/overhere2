// src/app/places/[placeId]/_components/PlaceHeader.tsx
import type { PlaceId } from "@/lib/types/database";

type PlaceHeaderProps = {
  place: {
    id: PlaceId;
    name: string;
    address: string;
  };
};

export default function PlaceHeader({ place }: PlaceHeaderProps) {
  return (
    <header className="space-y-2 text-center">
      <h1 className="text-2xl font-bold">{place.name}</h1>
      <p className="text-muted-foreground text-sm">{place.address}</p>
    </header>
  );
}
