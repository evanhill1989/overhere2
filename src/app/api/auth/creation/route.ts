// src/app/api/auth/creation/route.ts
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
// Adjust path to your server.ts

import { getUserByKindeId } from "@/db/queries/select";
import { usersTable } from "@/db/schema";
import { db as drizzleDb } from "@/index"; // Your Drizzle client for app DB operations
import { createClient as createSupabaseServerClient } from "@/lib/utils/supabase/server";

export async function GET(request: Request) {
  // First, get Kinde user details for your application's database logic
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  if (!kindeUser || !kindeUser.id) {
    console.error(
      "Kinde user not found in /api/auth/creation. Cannot proceed.",
    );
    // Redirect to login or an error page if Kinde session is expected but not found
    return NextResponse.redirect(
      new URL("/api/auth/login?error=kinde_user_missing", request.url),
    );
  }

  // Create an authenticated Supabase server client using your utility.
  // This utility should handle Kinde token retrieval, JWT signing, and cookie setup.
  const supabase = await createSupabaseServerClient();

  // Perform an authenticated operation with this Supabase client.
  // This call is crucial: it uses the token configured in createSupabaseServerClient.
  // If the token is valid (Supabase validates it using the shared JWT secret),
  // Supabase will recognize the user, and @supabase/ssr will set the session cookies in the response.
  const {
    data: { user: supabaseUser },
    error: supabaseAuthError,
  } = await supabase.auth.getUser();

  if (supabaseAuthError || !supabaseUser) {
    console.error(
      "Error fetching Supabase user in /api/auth/creation (using Kinde-derived token via server.ts utility), or no Supabase user resolved:",
      supabaseAuthError,
    );
    // This could indicate:
    // 1. The token created in your server.ts was not valid for Supabase (check signing, claims like 'sub', 'aud', 'role', 'exp').
    // 2. The SUPABASE_JWT_SECRET (which is KINDE_CLIENT_SECRET) is mismatched.
    return NextResponse.redirect(
      new URL("/auth-error-supabase-validation", request.url),
    );
  }

  // Optional but recommended: Verify the Kinde user ID matches the Supabase user ID (sub claim)
  if (supabaseUser.id !== kindeUser.id) {
    console.error(
      `Critical ID Mismatch: Kinde User ID (${kindeUser.id}) does not match Supabase User ID (${supabaseUser.id}) from token.`,
    );
    return NextResponse.redirect(
      new URL("/auth-error-id-mismatch", request.url),
    );
  }
  console.log(
    "Supabase session validated server-side for Kinde user:",
    supabaseUser.id,
    "Role:",
    supabaseUser.role,
  );

  // Proceed with your application-specific database logic (checking/creating user in your usersTable)
  try {
    const dbUserArray = await getUserByKindeId(kindeUser.id);
    if (!dbUserArray || dbUserArray.length === 0) {
      if (!kindeUser.given_name || !kindeUser.email) {
        console.error(
          "Kinde user object missing given_name or email for DB insert:",
          kindeUser,
        );
        return NextResponse.redirect(
          new URL("/auth-error-profile-data", request.url),
        );
      }
      await drizzleDb.insert(usersTable).values({
        kinde_id: kindeUser.id,
        name: kindeUser.given_name,
        email: kindeUser.email,
      });
      console.log("User upserted in application DB:", kindeUser.id);
    }
  } catch (dbError) {
    console.error(
      "Error interacting with usersTable in /api/auth/creation:",
      dbError,
    );
    return NextResponse.redirect(new URL("/auth-error-db-sync", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url)); // Or KINDE_POST_LOGIN_REDIRECT_URL if it's different
}
