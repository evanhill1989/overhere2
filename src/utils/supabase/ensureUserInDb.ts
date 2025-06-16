import { db } from "@/lib/db";
import { usersTable } from "@/lib/schema";
import { eq } from "drizzle-orm";

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: string;
  };
};

export async function ensureUserInDb(user: SupabaseUser) {
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.id));

  if (existingUser.length === 0) {
    await db.insert(usersTable).values({
      id: user.id,
      name: user.user_metadata.full_name || "Anonymous",
      email: user.email ?? `no-email-${user.id}@example.com`,
    });
  }
}
