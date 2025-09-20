// src/utils/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

// Create admin client for bypassing RLS when needed
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // SERVICE ROLE KEY - bypasses RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
};
