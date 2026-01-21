import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserActiveCheckins } from "@/app/_actions/ownershipQueries";
import { PlaceSelectionClient } from "./client";

export default async function SelectPlacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/claim/select-place");
  }

  // Fetch user's active check-ins
  const checkinsResult = await getUserActiveCheckins();

  if (!checkinsResult.success) {
    redirect("/claim/start");
  }

  const checkins = checkinsResult.checkins || [];

  return <PlaceSelectionClient checkins={checkins} />;
}
