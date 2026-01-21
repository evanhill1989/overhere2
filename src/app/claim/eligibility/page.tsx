import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ClaimEligibilityClient } from "./client";

export default async function ClaimEligibilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/claim/eligibility");
  }

  return <ClaimEligibilityClient />;
}
