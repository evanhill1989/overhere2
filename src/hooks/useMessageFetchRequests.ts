// src/hooks/useMessageFetchRequests.ts (CREATE NEW FILE)
"use client";

import { useQuery } from "@tanstack/react-query";

type MessageRequest = {
  id: string;
  initiatorId: string;
  initiateeId: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  placeId: string;
  createdAt: string;
  topic: string | null;
};

async function fetchMessageRequests(userId: string): Promise<MessageRequest[]> {
  const res = await fetch(`/api/requests?userId=${userId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch requests: ${res.status}`);
  }
  return res.json();
}

export function useMessageFetchRequests(userId: string | null) {
  return useQuery({
    queryKey: ["messageRequests", userId],
    queryFn: () => fetchMessageRequests(userId!),
    enabled: !!userId,
    refetchInterval: 15000,
    staleTime: 5000,
  });
}
