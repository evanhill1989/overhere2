// src/app/places/[placeId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { placeIdSchema, userIdSchema } from "@/lib/types/core";
import { getPlaceVerificationDetails } from "@/app/_actions/ownershipQueries"; // NEW
import type { PlaceVerificationDetails } from "@/lib/types/database";
import { db } from "@/lib/db";
import { placesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";

import { PlacePageClientPrimerWrapper } from "./_components/PlacePagePrimerWrapper";

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
  const placeInfo = await db.query.placesTable.findFirst({
    where: eq(placesTable.id, placeId),
  });

  if (!placeInfo) {
    console.log("❌ Place not found in cache:", placeId);
    return notFound();
  }

  // ============================================
  // 3. FETCH VERIFICATION DETAILS (NEW)
  // ============================================
  const verificationResult = await getPlaceVerificationDetails(placeId);
  const verificationDetails: PlaceVerificationDetails | null =
    !verificationResult.success
      ? null
      : !verificationResult.isVerified
        ? { isVerified: false }
        : {
            isVerified: true,
            verifiedOwner: verificationResult.verifiedOwner,
            businessContact: verificationResult.businessContact,
            customDescription: verificationResult.customDescription,
          };

  // ============================================
  // 4. RENDER CLIENT COMPONENT
  // ============================================
  return (
    <main className="container mx-auto max-w-2xl p-4">
      <PlacePageClientPrimerWrapper
        placeId={placeId}
        userId={userId}
        placeInfo={{
          id: placeId,
          name: placeInfo.name,
          address: placeInfo.address,
        }}
        verificationDetails={verificationDetails}
      />
    </main>
  );
}
