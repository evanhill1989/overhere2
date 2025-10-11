// src/app/places/[placeId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { placeIdSchema, userIdSchema } from "@/lib/types/core";
import type { PageProps } from "@/lib/types/pageProps";
import { PlacePageClient } from "./_components/PlacePageClient";

import { getCheckinsAtPlace } from "@/app/_actions/checkinQueries";
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";

export default async function PlacePage(props: PageProps) {
  const { placeId: rawPlaceId } = await props.params;

  // 1️⃣  AUTH CHECK
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("❌ Not authenticated, redirecting to home");
    redirect("/");
  }

  // 2️⃣  VALIDATE IDS
  let placeId;
  let userId;
  try {
    placeId = placeIdSchema.parse(rawPlaceId);
    userId = userIdSchema.parse(user.id);
    console.log("✅ IDs validated:", { placeId, userId });
  } catch (error) {
    console.error("❌ Invalid ID format:", error);
    return notFound();
  }

  // 3️⃣  VERIFY PLACE EXISTS (minimal)
  const { data: checkins } = await supabase
    .from("checkins")
    .select("place_name, place_address")
    .eq("place_id", placeId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!checkins) {
    console.log("❌ No active checkins at this place");
    return notFound();
  }

  const placeInfo = {
    id: placeId,
    name: checkins.place_name,
    address: checkins.place_address,
  };
  console.log("✅ Place found:", placeInfo.name);

  // 4️⃣  SERVER PREFETCH OF CHECKINS
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["checkins", placeId],
    queryFn: () => getCheckinsAtPlace(placeId),
  });
  const dehydratedState = dehydrate(queryClient);

  // 5️⃣  RENDER CLIENT COMPONENT + HYDRATION
  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <HydrationBoundary state={dehydratedState}>
        <PlacePageClient
          placeId={placeId}
          userId={userId}
          placeInfo={placeInfo}
        />
      </HydrationBoundary>
    </main>
  );
}
