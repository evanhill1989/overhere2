// src/app/dashboard/places/[placeId]/promotions/page.tsx
import { placeIdSchema } from "@/lib/types/database";
import { getPlacePromotions } from "@/app/_actions/ownerQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PromotionForm from "../_components/PromotionForm";

type PageProps = {
  params: Promise<{ placeId: string }>;
};

export default async function PromotionsPage({ params }: PageProps) {
  const { placeId: rawPlaceId } = await params;
  const placeId = placeIdSchema.parse(rawPlaceId);

  // ============================================
  // FETCH EXISTING PROMOTIONS
  // ============================================
  const result = await getPlacePromotions({ placeId });

  if (!result.success) {
    return (
      <div className="text-destructive">
        Error loading promotions: {result.error}
      </div>
    );
  }

  const promotions = result.data?.promotions || [];

  // ============================================
  // RENDER PROMOTIONS LIST AND FORM
  // ============================================
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Promotions</h2>
        <p className="text-muted-foreground text-sm">
          Create and manage promotional features for your place
        </p>
      </div>

      {/* Create New Promotion Form */}
      <PromotionForm placeId={placeId} />

      {/* Existing Promotions List */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Active & Scheduled</h3>
        {promotions.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center">
              No promotions yet. Create one above to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => (
              <Card key={promo.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {promo.title || `${promo.type} Promotion`}
                    </CardTitle>
                    <Badge
                      variant={
                        promo.status === "active"
                          ? "default"
                          : promo.status === "scheduled"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {promo.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{promo.type}</span>
                  </div>
                  {promo.message && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Message
                      </span>
                      <p className="mt-1 text-sm">{promo.message}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Start</span>
                    <span>{new Date(promo.startAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">End</span>
                    <span>{new Date(promo.endAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(promo.createdAt).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
