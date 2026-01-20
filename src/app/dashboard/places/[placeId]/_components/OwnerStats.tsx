// src/app/dashboard/places/[placeId]/_components/OwnerStats.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OwnerStatsProps = {
  label: string;
  value: number;
  description?: string;
};

export default function OwnerStats({
  label,
  value,
  description,
}: OwnerStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-muted-foreground mt-2 text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
