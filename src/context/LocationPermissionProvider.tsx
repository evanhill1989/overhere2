// src/context/LocationPermissionProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LocationData = {
  latitude: number;
  longitude: number;
};

export type PermissionState =
  | "initial"
  | "loading_status"
  | "prompt"
  | "denied"
  | "granted"
  | "fetching_location"
  | "error"
  | "unsupported";

interface LocationContextType {
  location: LocationData | null;
  permissionStatus: PermissionState;
  isLoadingGeo: boolean;
  geoError: string | null;
  requestBrowserLocationPermission: () => void;
  checkInitialPermission: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

function LocationOnboardingUI({
  onAllow,
  status,
  errorMessage,
}: {
  onAllow: () => void;
  status: PermissionState;
  errorMessage: string | null;
}) {
  // ... (Keep the refined UI logic from the previous version with tailored messages)
  let title = "Enable Location Access";
  let primaryMessage =
    "overHere uses your location to show you nearby places and people, and to verify you're at a location when checking in.";
  let buttonText = "Enable Location & Find People";
  let guidanceMessage: ReactNode = null;

  if (status === "denied") {
    title = "Location Access Denied";
    primaryMessage =
      "You've previously denied location access for overHere. To use the app's core features, please enable location permission in your browser's site settings.";
    buttonText = "I've Updated Settings, Check Again";
    guidanceMessage = (
      <p className="text-muted-foreground mt-4 text-xs">
        Look for a location icon in your browser's address bar or check site
        settings to change permissions.
      </p>
    );
  } else if (
    status === "error" &&
    errorMessage &&
    !errorMessage.toLowerCase().includes("denied")
  ) {
    title = "Location Error";
    primaryMessage = `There was an issue getting your location: ${errorMessage}`;
    buttonText = "Try Getting Location Again";
  } else if (status === "prompt") {
    primaryMessage =
      "To discover who's around and open to chatting at your current spot, overHere needs your location.";
    buttonText = "Enable Location and Find People";
  }

  if (
    errorMessage &&
    errorMessage.toLowerCase().includes("denied") &&
    status !== "denied"
  ) {
    title = "Location Access Required";
    primaryMessage =
      "Location permission is required. If you previously denied it, please enable it in your browser settings, then try again.";
    buttonText = "Try Enabling Location";
    guidanceMessage = (
      <p className="text-muted-foreground mt-3 text-xs">
        You may need to adjust permissions in your browser's site settings
        first.
      </p>
    );
  }
  return (
    <div className="flex min-h-[calc(100vh-150px)] flex-col items-center justify-center p-4 text-center sm:p-6">
      <div className="max-w-md">
        <h2 className="font-heading mb-3 text-2xl font-bold sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm sm:text-base">
          {primaryMessage}
        </p>
        <Button onClick={onAllow} size="lg" className="w-full sm:w-auto">
          {buttonText}
        </Button>
        {guidanceMessage}
      </div>
    </div>
  );
}

export function LocationPermissionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState>("initial");
  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const isFetchingRef = useRef(false); // Ref to track if a fetch is in progress

  const requestDeviceLocation = useCallback(
    (isInitialGrant = false) => {
      if (!navigator.geolocation) {
        setGeoError("Geolocation is not supported.");
        setPermissionStatus("unsupported");
        return;
      }
      if (isFetchingRef.current && !isInitialGrant) return; // Prevent re-entry if already fetching unless it's an initial grant

      setGeoError(null);
      setIsLoadingGeo(true);
      setPermissionStatus("fetching_location");
      isFetchingRef.current = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setPermissionStatus("granted");
          setIsLoadingGeo(false);
          isFetchingRef.current = false;
        },
        (error) => {
          setIsLoadingGeo(false);
          isFetchingRef.current = false;
          let message = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message =
                "Location permission was denied. To use overHere, please enable location access in your browser settings and then click 'Try Again'.";
              setPermissionStatus("denied");
              break;
            case error.POSITION_UNAVAILABLE:
              message =
                "Location information is currently unavailable. Please ensure your device's location service is on.";
              setPermissionStatus("error");
              break;
            case error.TIMEOUT:
              message =
                "The request to get your location timed out. Please try again.";
              setPermissionStatus("error");
              break;
            default:
              message =
                "An unknown error occurred while trying to get your location.";
              setPermissionStatus("error");
              break;
          }
          setGeoError(message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    },
    [location],
  ); // Added location to dep array of requestDeviceLocation due to its use in onchange logic

  const checkInitialPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermissionStatus("unsupported");
      return;
    }
    if (!navigator.permissions?.query) {
      setPermissionStatus("prompt");
      return;
    }

    // Avoid re-checking if already processing or granted with location
    if (
      permissionStatus !== "initial" &&
      permissionStatus !== "loading_status"
    ) {
      if (permissionStatus === "granted" && location) return;
      if (isLoadingGeo || isFetchingRef.current) return;
    }

    setPermissionStatus("loading_status");
    try {
      const permStatusObj = await navigator.permissions.query({
        name: "geolocation",
      });
      setPermissionStatus(permStatusObj.state as PermissionState);

      if (permStatusObj.state === "granted") {
        requestDeviceLocation(true); // Pass flag indicating it's part of initial grant flow
      }

      permStatusObj.onchange = () => {
        const newStatus = permStatusObj.state as PermissionState;
        setPermissionStatus(newStatus); // Always update internal state to reflect browser
        if (newStatus === "granted" && !location && !isFetchingRef.current) {
          requestDeviceLocation(true);
        } else if (newStatus === "denied") {
          setLocation(null);
          setGeoError(
            "Location permission was changed to denied in browser settings.",
          );
        }
      };
    } catch (e) {
      console.warn("Permissions API query failed, defaulting to prompt.", e);
      setPermissionStatus("prompt");
    }
  }, [requestDeviceLocation, location, permissionStatus, isLoadingGeo]); // Include all relevant deps

  useEffect(() => {
    checkInitialPermission();
  }, [checkInitialPermission]); // Run checkInitialPermission once on mount or if it changes (it won't)

  const contextValue = {
    location,
    permissionStatus,
    isLoadingGeo,
    geoError,
    requestBrowserLocationPermission: requestDeviceLocation,
    checkInitialPermission,
  };

  if (permissionStatus === "initial" || permissionStatus === "loading_status") {
    return (
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (permissionStatus === "fetching_location" && isLoadingGeo) {
    return (
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <span className="ml-2">Getting location...</span>
      </div>
    );
  }
  if (permissionStatus === "unsupported") {
    return (
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center p-4 text-center">
        <p className="text-destructive max-w-md">
          Geolocation is not supported by your browser. overHere requires
          location access to function.
        </p>
      </div>
    );
  }
  if (permissionStatus !== "granted") {
    return (
      <LocationOnboardingUI
        onAllow={requestDeviceLocation}
        status={permissionStatus}
        errorMessage={geoError}
      />
    );
  }

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export const useAppLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error(
      "useAppLocation must be used within a LocationPermissionProvider",
    );
  }
  return context;
};
