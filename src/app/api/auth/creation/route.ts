// src/app/api/auth/creation/route.ts
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/utils/supabase/server"; // Import your working server.ts client

import { getUserByKindeId } from "@/db/queries/select";
import { usersTable } from "@/db/schema";
import { db as drizzleDb } from "@/index";
import jwt from "jsonwebtoken"; // Import for decoding

export async function GET(request: Request) {
  const { getUser, getIdToken } = getKindeServerSession();
  const kindeUser = await getUser();
  const kindeIdTokenPayload = await getIdToken();

  if (!kindeUser || !kindeUser.id) {
    console.error("Kinde user not found in /api/auth/creation.");
    return NextResponse.redirect(
      new URL("/api/auth/login?error=kinde_user_missing", request.url),
    );
  }

  // --- START DIAGNOSTIC LOGGING ---
  if (kindeIdTokenPayload && process.env.KINDE_CLIENT_SECRET) {
    try {
      const signedToken = jwt.sign(
        kindeIdTokenPayload,
        process.env.KINDE_CLIENT_SECRET,
      );
      const decodedPayload = jwt.decode(signedToken);
      console.log("--- DECODED JWT PAYLOAD BEING SENT TO SUPABASE ---");
      console.log(decodedPayload);
      console.log("-------------------------------------------------");
    } catch (e) {
      console.error("Error signing/decoding token for debug purposes:", e);
    }
  }
  // --- END DIAGNOSTIC LOGGING ---
  // Use the working utility from server.ts to create an authenticated Supabase server client.
  // This client is configured to use the Kinde-derived token and manage cookies.
  const supabase = await createSupabaseServerClient();

  // Perform an authenticated operation. This validates the token with Supabase
  // AND allows @supabase/ssr to set the session cookies in the response header.
  // THIS IS THE CRITICAL STEP THAT SYNCS THE SESSION TO THE BROWSER.
  const {
    data: { user: supabaseUser },
    error: supabaseAuthError,
  } = await supabase.auth.getUser();

  if (supabaseAuthError || !supabaseUser) {
    console.error(
      "Error establishing Supabase session in /api/auth/creation:",
      supabaseAuthError,
    );
    // This indicates the token validation failed. Check JWT secrets match.
    return NextResponse.redirect(
      new URL("/auth-error-supabase-validation", request.url),
    );
  }

  // Sanity check that the Kinde user ID matches the user ID in the validated Supabase token.
  if (supabaseUser.id !== kindeUser.id) {
    console.error(
      `ID Mismatch: Kinde User ID (${kindeUser.id}) vs Supabase User ID (${supabaseUser.id}).`,
    );
    return NextResponse.redirect(
      new URL("/auth-error-id-mismatch", request.url),
    );
  }

  // Now, perform your application-specific database logic
  try {
    const dbUserArray = await getUserByKindeId(kindeUser.id);
    if (!dbUserArray || dbUserArray.length === 0) {
      if (!kindeUser.given_name || !kindeUser.email) {
        // Handle missing Kinde data needed for your public.users table
        return NextResponse.redirect(
          new URL("/auth-error-profile-data", request.url),
        );
      }
      await drizzleDb.insert(usersTable).values({
        kinde_id: kindeUser.id,
        name: kindeUser.given_name,
        email: kindeUser.email,
      });
    }
  } catch (dbError) {
    console.error("Error upserting user in /api/auth/creation:", dbError);
    return NextResponse.redirect(new URL("/auth-error-db-sync", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
