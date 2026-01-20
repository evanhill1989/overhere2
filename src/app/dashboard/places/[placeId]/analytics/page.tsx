// src/app/dashboard/places/[placeId]/analytics/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Analytics</h2>
        <p className="text-muted-foreground text-sm">
          Detailed insights about your place activity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Advanced analytics features are under development
          </p>
          <p className="text-muted-foreground text-sm">
            Future features will include:
          </p>
          <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
            <li>• Hourly/daily check-in trends</li>
            <li>• Peak activity times</li>
            <li>• User engagement metrics</li>
            <li>• Message session analytics</li>
            <li>• Promotion performance tracking</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
