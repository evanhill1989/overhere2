// src/utils/supabase/server.ts (or your path)
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const createClient = async () => {
  const cookieStore = await cookies();

  const { getIdToken, getUser } = getKindeServerSession();
  const kindeUser = await getUser();
  const kindeIdTokenPayload = await getIdToken();

  let tokenToUseInHeader: string;

  if (
    kindeUser &&
    kindeUser.id &&
    kindeIdTokenPayload &&
    process.env.KINDE_CLIENT_SECRET
  ) {
    const claimsForSupabase = {
      ...kindeIdTokenPayload,
      sub: kindeUser.id,
      aud: "authenticated",
      role: "authenticated",
      exp: kindeIdTokenPayload.exp || Math.floor(Date.now() / 1000) + 60 * 60,
      iat: kindeIdTokenPayload.iat || Math.floor(Date.now() / 1000),
    };

    try {
      tokenToUseInHeader = jwt.sign(
        claimsForSupabase,
        process.env.KINDE_CLIENT_SECRET,
      );
    } catch (signError) {
      console.error("Error signing Kinde token for Supabase:", signError);
      tokenToUseInHeader = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    }
  } else {
    if (!process.env.KINDE_CLIENT_SECRET && kindeUser) {
      console.error(
        "KINDE_CLIENT_SECRET (Supabase JWT Secret) is not set in environment variables.",
      );
    }
    tokenToUseInHeader = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${tokenToUseInHeader}`,
        },
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.error(error);
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
};
