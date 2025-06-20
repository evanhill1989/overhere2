// app/hooks/usePollMessageRequests.ts
"use client";

import { useEffect, useState } from "react";

type MessageRequest = {
  id: string;
  initiatorId: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  placeId: string;
  createdAt: string;
};

export function usePollMessageRequests(
  userId: string | null,
  placeId: string | null,
) {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  console.log(userId, placeId, "<<<<<<<<<<<<<-------------userId placeId");
  useEffect(() => {
    if (!userId || !placeId) return;

    let intervalId: NodeJS.Timeout;

    const fetchRequests = async () => {
      try {
        const res = await fetch(
          `/api/requests?userId=${userId}&placeId=${placeId}`,
        );
        const data = await res.json();
        setRequests(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch message requests:", error);
      }
    };

    fetchRequests();
    // eslint-disable-next-line prefer-const
    intervalId = setInterval(fetchRequests, 15_000);

    return () => clearInterval(intervalId);
  }, [userId, placeId]);

  return { requests, isLoading };
}
