// app/hooks/usePollMessageRequests.ts
"use client";

import { useEffect, useState } from "react";

type MessageRequest = {
  id: string;
  initiatorId: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  createdAt: string;
};

export function usePollMessageRequests(userId: string | null) {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let intervalId: NodeJS.Timeout;

    const fetchRequests = async () => {
      try {
        const res = await fetch(`/api/requests?userId=${userId}`);
        const data = await res.json();
        setRequests(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch message requests:", error);
      }
    };

    fetchRequests();
    intervalId = setInterval(fetchRequests, 15_000); // Poll every 15 seconds

    return () => clearInterval(intervalId);
  }, [userId]);

  return { requests, isLoading };
}
