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

export type LocationData = { latitude: number; longitude: number };
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
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

function LocationOnboardingUI({
  onAllow,
  status,
  errorMessage,
  isLoading,
}: {
  onAllow: () => void;
  status: PermissionState;
  errorMessage: string | null;
  isLoading: boolean;
}) {
  let title = "Enable Location Access";
  let primaryMessage =
    "overHere uses your location to show you nearby places and people, and to verify your check-ins.";
  let buttonText = "Enable Location & Find People";
  let guidanceMessage: ReactNode = null;

  if (status === "denied") {
    title = "Location Access Denied";
    primaryMessage =
      "You've previously denied location access. To use overHere, please enable location permission for this site in your browser settings.";
    buttonText = "I've Enabled Settings, Check Again";
    guidanceMessage = (
      <p className="text-muted-foreground mt-4 text-xs">
        Look for a location icon (often a padlock) in your browser's address bar
        or check site settings to change permissions. You may need to reload the
        page after.
      </p>
    );
  } else if (
    status === "error" &&
    errorMessage &&
    !errorMessage.toLowerCase().includes("denied")
  ) {
    title = "Location Error";
    primaryMessage = `We couldn't get your location: ${errorMessage}`;
    buttonText = "Try Getting Location Again";
  } else if (status === "prompt") {
    primaryMessage =
      "To discover who's around and open to chatting at your current spot, overHere needs your location for the best experience.";
    buttonText = "Grant Location Access";
  }
  if (
    errorMessage &&
    errorMessage.toLowerCase().includes("denied") &&
    status !== "denied"
  ) {
    title = "Location Access Required";
    primaryMessage =
      "Location permission is required. It seems it was denied. Please enable it in your browser settings, then try again.";
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
        <Button
          onClick={onAllow}
          size="lg"
          className="w-full sm:w-auto"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Checking..." : buttonText}
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

  const isFetchingLocationRef = useRef(false);
  const permissionStatusObjRef = useRef<PermissionStatus | null>(null);

  const requestDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation API not supported by this browser.");
      setPermissionStatus("unsupported");
      isFetchingLocationRef.current = false;
      return;
    }
    if (isFetchingLocationRef.current) return;

    setGeoError(null);
    setIsLoadingGeo(true);
    setPermissionStatus("fetching_location");
    isFetchingLocationRef.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setPermissionStatus("granted");
        setIsLoadingGeo(false);
        isFetchingLocationRef.current = false;
      },
      (error) => {
        setIsLoadingGeo(false);
        isFetchingLocationRef.current = false;
        let message = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission denied. Please enable it in browser settings and try again.";
            setPermissionStatus("denied");
            break;
          case error.POSITION_UNAVAILABLE:
            message =
              "Location information unavailable. Ensure device location is on.";
            setPermissionStatus("error");
            break;
          case error.TIMEOUT:
            message = "Getting location timed out. Please try again.";
            setPermissionStatus("error");
            break;
          default:
            message = "Unknown error getting location.";
            setPermissionStatus("error");
            break;
        }
        setGeoError(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    let localPermStatusObjForCleanup: PermissionStatus | null = null;

    const handleBrowserPermissionChange = () => {
      if (!mounted || !localPermStatusObjForCleanup) return;
      const newStatus = localPermStatusObjForCleanup.state as PermissionState;
      setPermissionStatus(newStatus);
      if (newStatus === "denied") {
        setLocation(null);
        setGeoError(
          "Location permission was changed to denied in browser settings.",
        );
      }
    };

    const initializePermissionState = async () => {
      if (!mounted) return;
      if (!navigator.geolocation) {
        if (mounted) setPermissionStatus("unsupported");
        return;
      }
      if (mounted) setPermissionStatus("loading_status");

      if (navigator.permissions?.query) {
        try {
          const permObj = await navigator.permissions.query({
            name: "geolocation",
          });
          localPermStatusObjForCleanup = permObj;
          if (!mounted) return;
          const queriedStatus = permObj.state as PermissionState;
          setPermissionStatus(queriedStatus);
          if (queriedStatus === "granted") {
            requestDeviceLocation();
          } else if (queriedStatus === "prompt") {
            requestDeviceLocation();
          } else if (queriedStatus === "denied") {
            if (!geoError)
              setGeoError(
                "Location permission is denied. Please enable it in browser settings.",
              );
          }
          permObj.onchange = handleBrowserPermissionChange;
        } catch (err) {
          if (!mounted) return;
          setPermissionStatus("prompt");
          requestDeviceLocation();
          console.error(err);
        }
      } else {
        if (mounted) {
          setPermissionStatus("prompt");
          requestDeviceLocation();
        }
      }
    };
    initializePermissionState();
    return () => {
      mounted = false;
      if (
        localPermStatusObjForCleanup &&
        localPermStatusObjForCleanup.onchange === handleBrowserPermissionChange
      ) {
        localPermStatusObjForCleanup.onchange = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestDeviceLocation]); // Make this effect run only once or when requestDeviceLocation changes (it's stable)

  // Separate effect to act on permissionStatus changes, specifically for 'granted'
  useEffect(() => {
    if (
      permissionStatus === "granted" &&
      !location &&
      !isFetchingLocationRef.current
    ) {
      requestDeviceLocation();
    }
  }, [permissionStatus, location, requestDeviceLocation]);

  const contextValue: LocationContextType = {
    location,
    permissionStatus,
    isLoadingGeo,
    geoError,
    requestBrowserLocationPermission: requestDeviceLocation,
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
          Geolocation API not supported.
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
        isLoading={isLoadingGeo}
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
  if (context === undefined)
    throw new Error(
      "useAppLocation must be used within a LocationPermissionProvider",
    );
  return context;
};
