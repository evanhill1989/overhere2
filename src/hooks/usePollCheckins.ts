"use client";
import { useEffect, useState } from "react";
import { SelectCheckin } from "@/lib/schema";

export function usePollCheckins(placeId: string | null) {
  const [checkins, setCheckins] = useState<SelectCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // console.log("👀 usePollCheckins CALLED with placeId:", placeId);

  useEffect(() => {
    if (!placeId) {
      // console.log("❌ usePollCheckins skipped — no placeId");
      return;
    }

    // console.log("🚨 Starting polling for checkins at:", placeId);

    let intervalId: NodeJS.Timeout;

    const fetchCheckins = async () => {
      // console.log("📡 Polling request sent to /api/checkins");
      try {
        const res = await fetch(`/api/checkins?placeId=${placeId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        // console.log("✅ Polling response data:", data);
        setCheckins(data);
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Failed to fetch checkins:", error);
      }
    };

    fetchCheckins();
    // eslint-disable-next-line prefer-const
    intervalId = setInterval(fetchCheckins, 15000);
    return () => clearInterval(intervalId);
  }, [placeId]);

  return { checkins, isLoading };
}
