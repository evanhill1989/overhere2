// src/app/dashboard/places/[placeId]/_components/PromotionForm.tsx
"use client";

import { useState } from "react";
import { createPromotion } from "@/app/_actions/ownerActions";
import type { PlaceId } from "@/lib/types/database";
import { PROMOTION_TYPE } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type PromotionFormProps = {
  placeId: PlaceId;
};

export default function PromotionForm({ placeId }: PromotionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: PROMOTION_TYPE.FEATURED_MESSAGE,
    title: "",
    message: "",
    startAt: "",
    endAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startAt || !formData.endAt) {
      toast.error("Please set start and end dates");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPromotion({
        placeId,
        type: formData.type,
        title: formData.title || undefined,
        message: formData.message || undefined,
        startAt: formData.startAt,
        endAt: formData.endAt,
      });

      if (result.success) {
        toast.success(result.message || "Promotion created successfully");
        // Reset form
        setFormData({
          type: PROMOTION_TYPE.FEATURED_MESSAGE,
          title: "",
          message: "",
          startAt: "",
          endAt: "",
        });
        // Refresh the page to show new promotion
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create promotion");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error creating promotion:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Create New Promotion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Promotion Type */}
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Promotion Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, type: e.target.value }))
              }
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value={PROMOTION_TYPE.FEATURED_MESSAGE}>
                Featured Message
              </option>
              <option value={PROMOTION_TYPE.PRIORITY_SORT}>
                Priority Sort
              </option>
              <option value={PROMOTION_TYPE.HIGHLIGHT_BADGE}>
                Highlight Badge
              </option>
            </select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title (Optional)
            </label>
            <Input
              id="title"
              placeholder="e.g., Happy Hour Special"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message (Optional)
            </label>
            <Textarea
              id="message"
              placeholder="e.g., Join us for happy hour 5-7pm daily!"
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label htmlFor="startAt" className="text-sm font-medium">
              Start Date & Time
            </label>
            <Input
              id="startAt"
              type="datetime-local"
              value={formData.startAt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startAt: e.target.value }))
              }
              required
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label htmlFor="endAt" className="text-sm font-medium">
              End Date & Time
            </label>
            <Input
              id="endAt"
              type="datetime-local"
              value={formData.endAt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endAt: e.target.value }))
              }
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating..." : "Create Promotion"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
