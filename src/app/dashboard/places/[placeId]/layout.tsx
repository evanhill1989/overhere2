// src/app/dashboard/places/[placeId]/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requirePlaceOwner } from "@/lib/auth/ownershipAuth";
import { userIdSchema, placeIdSchema } from "@/lib/types/database";
import Link from "next/link";
import { placeLogger } from "@/lib/logger";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ placeId: string }>;
};

export default async function OwnerDashboardLayout({
  children,
  params,
}: LayoutProps) {
  const { placeId: rawPlaceId } = await params;
  placeLogger.debug("[Dashboard] Raw placeId:", rawPlaceId);

  // ============================================
  // 1. AUTHENTICATION CHECK
  // ============================================
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  placeLogger.debug("[Dashboard] User:", user?.id, user?.email);
  placeLogger.debug("[Dashboard] Auth error:", authError);

  if (authError || !user) {
    placeLogger.warn("[Dashboard] No user, redirecting");
    redirect("/");
  }

  // ============================================
  // 2. VALIDATE IDS
  // ============================================
  let placeId, userId;
  try {
    placeId = placeIdSchema.parse(rawPlaceId);
    userId = userIdSchema.parse(user.id);
    placeLogger.debug("[Dashboard] Parsed IDs - userId:", userId, "placeId:", placeId);
  } catch (error) {
    placeLogger.error("[Dashboard] ID validation failed:", error);
    redirect("/");
  }

  // ============================================
  // 3. OWNERSHIP VERIFICATION
  // ============================================
  try {
    placeLogger.debug("[Dashboard] Calling requirePlaceOwner...");
    await requirePlaceOwner(userId, placeId);
    placeLogger.debug("[Dashboard] Ownership verified!");
  } catch (error) {
    placeLogger.error("[Dashboard] Ownership verification failed:", error);
    redirect("/");
  }

  // ============================================
  // 4. RENDER LAYOUT WITH TAB NAVIGATION
  // ============================================
  const basePath = `/dashboard/places/${placeId}`;

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">Owner Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage your place presence on OverHere
        </p>
      </div>

      {/* Tab Navigation */}
      <nav className="mb-6 border-b">
        <div className="flex gap-4">
          <TabLink href={basePath} label="Overview" />
          <TabLink href={`${basePath}/profile`} label="Profile" />
          <TabLink href={`${basePath}/promotions`} label="Promotions" />
          <TabLink href={`${basePath}/analytics`} label="Analytics" />
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}

// ============================================
// TAB LINK COMPONENT
// ============================================
function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="hover:border-primary/50 border-b-2 border-transparent px-1 pb-3 text-sm font-medium transition-colors"
    >
      {label}
    </Link>
  );
}
