// src/app/places/[placeId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { placeIdSchema, userIdSchema } from "@/lib/types/core";

import type { PageProps } from "@/lib/types/pageProps";
import { PlacePageClient } from "./_components/PlacePageClient";

export default async function PlacePage(props: PageProps) {
  const { placeId: rawPlaceId } = await props.params;

  // ============================================
  // 1. AUTHENTICATION CHECK
  // ============================================
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("❌ Not authenticated, redirecting to home");
    redirect("/");
  }

  // ============================================
  // 2. VALIDATE IDS WITH BRANDED TYPES
  // ============================================
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

  // ============================================
  // 3. VERIFY PLACE EXISTS (Minimal Check)
  // ============================================
  // We just need to verify this is a valid place
  // The client component will handle fetching full data
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

  // ============================================
  // 4. RENDER CLIENT COMPONENT
  // ============================================
  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <PlacePageClient
        placeId={placeId}
        userId={userId}
        placeInfo={placeInfo}
      />
    </main>
  );
}
