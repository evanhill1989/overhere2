// src/app/dashboard/places/[placeId]/page.tsx
import { getOwnerDashboard } from "@/app/_actions/ownerQueries";
import { placeIdSchema } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OwnerStats from "./_components/OwnerStats";

type PageProps = {
  params: Promise<{ placeId: string }>;
};

export default async function OwnerDashboardOverview({ params }: PageProps) {
  const { placeId: rawPlaceId } = await params;
  const placeId = placeIdSchema.parse(rawPlaceId);

  // ============================================
  // FETCH DASHBOARD DATA SERVER-SIDE
  // ============================================
  const result = await getOwnerDashboard({ placeId });

  if (!result.success || !result.data) {
    return (
      <div className="text-destructive">
        Error loading dashboard: {result.error}
      </div>
    );
  }

  const { ownership, settings, analytics } = result.data;

  // ============================================
  // RENDER OVERVIEW
  // ============================================
  return (
    <div className="space-y-6">
      {/* Ownership Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ownership Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Role</span>
            <Badge variant="outline">{ownership.role}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              Subscription Status
            </span>
            <Badge
              variant={
                ownership.subscriptionStatus === "active" ||
                ownership.subscriptionStatus === "trialing"
                  ? "default"
                  : "destructive"
              }
            >
              {ownership.subscriptionStatus}
            </Badge>
          </div>
          {ownership.subscriptionCurrentPeriodEnd && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Subscription Ends
              </span>
              <span className="text-sm">
                {new Date(
                  ownership.subscriptionCurrentPeriodEnd,
                ).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Owner Since</span>
            <span className="text-sm">
              {new Date(ownership.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Stats */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Activity Overview</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <OwnerStats
            label="Active Check-ins"
            value={analytics.activeCheckins}
            description="Users currently checked in at this place"
          />
          <OwnerStats
            label="Active Sessions"
            value={analytics.activeSessions}
            description="Ongoing message conversations"
          />
          <OwnerStats
            label="Total Check-ins Today"
            value={analytics.totalCheckinsToday}
            description="All check-ins since midnight"
          />
        </div>
      </div>

      {/* Current Settings Summary */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.descriptionOverride && (
              <div>
                <span className="text-sm font-medium">
                  Description Override
                </span>
                <p className="text-muted-foreground mt-1 text-sm">
                  {settings.descriptionOverride}
                </p>
              </div>
            )}
            {settings.announcementText && (
              <div>
                <span className="text-sm font-medium">Active Announcement</span>
                <p className="text-muted-foreground mt-1 text-sm">
                  {settings.announcementText}
                </p>
                {settings.announcementExpiresAt && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Expires:{" "}
                    {new Date(settings.announcementExpiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            {settings.contactEmail && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Contact Email
                </span>
                <span className="text-sm">{settings.contactEmail}</span>
              </div>
            )}
            {settings.contactPhone && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Contact Phone
                </span>
                <span className="text-sm">{settings.contactPhone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
