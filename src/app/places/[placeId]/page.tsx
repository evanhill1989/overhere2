// src/app/places/[placeId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { placeIdSchema, userIdSchema } from "@/lib/types/core";

import { PlacePageClient } from "./_components/PlacePageClient";

type PageProps = {
  params: Promise<{ placeId: string }>;
};

export default async function PlacePage(props: PageProps) {
  const { placeId: rawPlaceId } = await props.params;

  // ============================================
  // 1. AUTHENTICATION & VALIDATION
  // ============================================
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  // Parse and validate IDs with branded types
  let placeId, userId;
  try {
    placeId = placeIdSchema.parse(rawPlaceId);
    userId = userIdSchema.parse(user.id);
  } catch (error) {
    console.error("❌ Invalid ID format:", error);
    return notFound();
  }

  // ============================================
  // 2. VERIFY PLACE EXISTS & GET BASIC INFO
  // ============================================
  const { data: placeInfo } = await supabase
    .from("checkins")
    .select("place_name, place_address")
    .eq("place_id", placeId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!placeInfo) {
    console.log("❌ No active checkins found for place:", placeId);
    return notFound();
  }

  // ============================================
  // 3. RENDER CLIENT COMPONENT
  // ============================================
  return (
    <main className="container mx-auto max-w-2xl p-4">
      <PlacePageClient
        placeId={placeId}
        userId={userId}
        placeInfo={{
          id: placeId,
          name: placeInfo.place_name,
          address: placeInfo.place_address,
        }}
      />
    </main>
  );
}
