import type { LocationData } from "@/hooks/useGeolocation"; // Adjust path
import { Button } from "./ui/button";

type LocationFinderProps = {
  location: LocationData | null;
  error: string | null;
  isLoading: boolean;
  onRequestLocation: () => void;
  isPlacesLoading: boolean;
};

export function LocationFinder({
  location,
  error,
  isLoading,
  onRequestLocation,
  isPlacesLoading,
}: LocationFinderProps) {
  return (
    <section>
      <Button
        onClick={onRequestLocation}
        disabled={isLoading || isPlacesLoading}
        className="px-4 py-2 cursor-pointer disabled:opacity-50 bg-primary hover:bg-blue-700 text-white rounded"
      >
        {isLoading
          ? "Getting Location..."
          : isPlacesLoading
          ? "Finding Places..."
          : "Find Nearby Places"}
      </Button>
      {error && <p className="text-red-500 mt-1">{error}</p>}
      {location && !error && (
        <p className="text-green-500 mt-1">
          Location Found: {location.latitude.toFixed(4)},{" "}
          {location.longitude.toFixed(4)}
        </p>
      )}
    </section>
  );
}
