"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ExplainLocationPage() {
  const router = useRouter();

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-primary text-3xl font-bold">Location Required</h1>
      <p className="text-foreground/80 max-w-md text-base">
        Overhere needs your location to show nearby places and connect you to
        others. You’ve denied access—please allow location in your browser
        settings.
      </p>
      <ul className="text-foreground/70 max-w-md list-disc text-left text-sm">
        <li>Click the lock icon next to the URL</li>
        <li>Change “Location” to “Allow”</li>
        <li>This page will automatically continue when location is enabled</li>
      </ul>
      <Button onClick={() => router.replace("/")}>Retry Now</Button>
    </div>
  );
}
