// src/app/explain-location/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ExplainLocationPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        permissionStatus = status;

        if (status.state === "granted") {
          router.replace("/");
        }

        status.onchange = () => {
          if (status.state === "granted") {
            router.replace("/");
          }
        };
      });

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [router]);

  const handleRetry = () => {
    setChecking(true);

    navigator.geolocation.getCurrentPosition(
      () => {
        router.replace("/");
      },
      (error) => {
        setChecking(false);
        console.error("Location error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-primary text-3xl font-bold">Location Required</h1>
      <p className="text-foreground/80 max-w-md text-base">
        Overhere needs your location to show nearby places and connect you to
        others. You've denied access—please allow location in your browser
        settings.
      </p>
      <ul className="text-foreground/70 max-w-md list-disc space-y-2 text-left text-sm">
        <li>Click the icon next to the URL in your browser</li>
        <li>Find "Location" and change it to "Allow"</li>
        <li>Click the button below to retry</li>
      </ul>
      <div className="flex gap-3">
        <Button onClick={handleRetry} disabled={checking}>
          {checking ? "Checking..." : "Retry Now"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
