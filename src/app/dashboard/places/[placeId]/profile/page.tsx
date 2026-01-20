// src/app/dashboard/places/[placeId]/profile/page.tsx
import { placeIdSchema } from "@/lib/types/database";
import { getOwnerDashboard } from "@/app/_actions/ownerQueries";
import ProfileSettingsForm from "../_components/ProfileSettingsForm";

type PageProps = {
  params: Promise<{ placeId: string }>;
};

export default async function ProfileManagementPage({ params }: PageProps) {
  const { placeId: rawPlaceId } = await params;
  const placeId = placeIdSchema.parse(rawPlaceId);

  // ============================================
  // FETCH CURRENT SETTINGS
  // ============================================
  const result = await getOwnerDashboard({ placeId });

  if (!result.success || !result.data) {
    return (
      <div className="text-destructive">
        Error loading settings: {result.error}
      </div>
    );
  }

  const { settings } = result.data;

  // ============================================
  // RENDER FORM
  // ============================================
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">Place Profile Settings</h2>
        <p className="text-muted-foreground text-sm">
          Customize how your place appears to users
        </p>
      </div>

      <ProfileSettingsForm placeId={placeId} currentSettings={settings} />
    </div>
  );
}
