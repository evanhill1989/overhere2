// src/app/dashboard/places/[placeId]/_components/ProfileSettingsForm.tsx
"use client";

import { useState } from "react";
import { updateOwnerSettings } from "@/app/_actions/ownerActions";
import type { PlaceId, PlaceOwnerSettings } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ProfileSettingsFormProps = {
  placeId: PlaceId;
  currentSettings: PlaceOwnerSettings | null;
};

export default function ProfileSettingsForm({
  placeId,
  currentSettings,
}: ProfileSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    descriptionOverride: currentSettings?.descriptionOverride || "",
    announcementText: currentSettings?.announcementText || "",
    announcementExpiresAt: currentSettings?.announcementExpiresAt
      ? new Date(currentSettings.announcementExpiresAt)
          .toISOString()
          .slice(0, 16)
      : "",
    contactEmail: currentSettings?.contactEmail || "",
    contactPhone: currentSettings?.contactPhone || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateOwnerSettings({
        placeId,
        descriptionOverride: formData.descriptionOverride || null,
        announcementText: formData.announcementText || null,
        announcementExpiresAt: formData.announcementExpiresAt || null,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
      });

      if (result.success) {
        toast.success(result.message || "Settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error updating settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Place Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description Override */}
          <div className="space-y-2">
            <label
              htmlFor="descriptionOverride"
              className="text-sm font-medium"
            >
              Description Override
            </label>
            <Textarea
              id="descriptionOverride"
              placeholder="Override the Google Places description with custom text"
              value={formData.descriptionOverride}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  descriptionOverride: e.target.value,
                }))
              }
              rows={3}
            />
            <p className="text-muted-foreground text-xs">
              Optional: Provide a custom description for your place
            </p>
          </div>

          {/* Announcement Text */}
          <div className="space-y-2">
            <label htmlFor="announcementText" className="text-sm font-medium">
              Announcement
            </label>
            <Textarea
              id="announcementText"
              placeholder="Special announcement for visitors (e.g., events, promotions)"
              value={formData.announcementText}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  announcementText: e.target.value,
                }))
              }
              rows={2}
            />
          </div>

          {/* Announcement Expiration */}
          <div className="space-y-2">
            <label
              htmlFor="announcementExpiresAt"
              className="text-sm font-medium"
            >
              Announcement Expires At
            </label>
            <Input
              id="announcementExpiresAt"
              type="datetime-local"
              value={formData.announcementExpiresAt}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  announcementExpiresAt: e.target.value,
                }))
              }
            />
            <p className="text-muted-foreground text-xs">
              Leave empty for no expiration
            </p>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <label htmlFor="contactEmail" className="text-sm font-medium">
              Contact Email
            </label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="contact@example.com"
              value={formData.contactEmail}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  contactEmail: e.target.value,
                }))
              }
            />
            <p className="text-muted-foreground text-xs">
              Public contact email for your place
            </p>
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <label htmlFor="contactPhone" className="text-sm font-medium">
              Contact Phone
            </label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.contactPhone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  contactPhone: e.target.value,
                }))
              }
            />
            <p className="text-muted-foreground text-xs">
              Public contact phone for your place
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
