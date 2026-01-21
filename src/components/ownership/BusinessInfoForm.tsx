"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type BusinessInfoFormProps = {
  claimId: string;
  placeName: string;
  onSubmit: (data: {
    claimId: string;
    role: "owner" | "manager";
    businessEmail: string;
    businessDescription: string;
    yearsAtLocation: string;
    phoneNumber: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
};

export function BusinessInfoForm({
  claimId,
  placeName,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
}: BusinessInfoFormProps) {
  const [formData, setFormData] = useState({
    role: "owner" as "owner" | "manager",
    businessEmail: "",
    businessDescription: "",
    yearsAtLocation: "",
    phoneNumber: "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.businessEmail) {
      errors.businessEmail = "Business email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
      errors.businessEmail = "Invalid email format";
    }

    if (!formData.businessDescription) {
      errors.businessDescription = "Description is required";
    } else if (formData.businessDescription.length < 10) {
      errors.businessDescription = "Description must be at least 10 characters";
    } else if (formData.businessDescription.length > 500) {
      errors.businessDescription =
        "Description must be less than 500 characters";
    }

    if (!formData.phoneNumber) {
      errors.phoneNumber = "Phone number is required";
    } else if (
      !/^\+?[1-9]\d{1,14}$/.test(formData.phoneNumber.replace(/\s/g, ""))
    ) {
      errors.phoneNumber =
        "Invalid phone number format (use E.164 format: +1234567890)";
    }

    if (!formData.yearsAtLocation) {
      errors.yearsAtLocation =
        "Please select how long you've been at this location";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      claimId,
      ...formData,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Business Information</h1>
        <p className="text-muted-foreground">
          Provide details about your role at {placeName}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role */}
        <div className="space-y-2">
          <Label htmlFor="role">Your Role *</Label>
          <Select
            value={formData.role}
            onValueChange={(value: "owner" | "manager") =>
              setFormData({ ...formData, role: value })
            }
          >
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Business Email */}
        <div className="space-y-2">
          <Label htmlFor="businessEmail">Business Email *</Label>
          <Input
            id="businessEmail"
            type="email"
            placeholder="owner@yourbusiness.com"
            value={formData.businessEmail}
            onChange={(e) =>
              setFormData({ ...formData, businessEmail: e.target.value })
            }
            className={
              validationErrors.businessEmail ? "border-destructive" : ""
            }
          />
          {validationErrors.businessEmail && (
            <p className="text-destructive text-sm">
              {validationErrors.businessEmail}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Preferably a business domain email (not Gmail, Yahoo, etc.)
          </p>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Business Phone Number *</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+1234567890"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData({ ...formData, phoneNumber: e.target.value })
            }
            className={validationErrors.phoneNumber ? "border-destructive" : ""}
          />
          {validationErrors.phoneNumber && (
            <p className="text-destructive text-sm">
              {validationErrors.phoneNumber}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Used for SMS verification. Include country code (e.g., +1 for US)
          </p>
        </div>

        {/* Years at Location */}
        <div className="space-y-2">
          <Label htmlFor="yearsAtLocation">
            How long have you been at this location? *
          </Label>
          <Select
            value={formData.yearsAtLocation}
            onValueChange={(value) =>
              setFormData({ ...formData, yearsAtLocation: value })
            }
          >
            <SelectTrigger
              id="yearsAtLocation"
              className={
                validationErrors.yearsAtLocation ? "border-destructive" : ""
              }
            >
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="less_than_1">Less than 1 year</SelectItem>
              <SelectItem value="1-2">1-2 years</SelectItem>
              <SelectItem value="3-5">3-5 years</SelectItem>
              <SelectItem value="5+">More than 5 years</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.yearsAtLocation && (
            <p className="text-destructive text-sm">
              {validationErrors.yearsAtLocation}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="businessDescription">
            Describe Your Role at This Business *
          </Label>
          <Textarea
            id="businessDescription"
            placeholder="Briefly describe your role and responsibilities..."
            value={formData.businessDescription}
            onChange={(e) =>
              setFormData({ ...formData, businessDescription: e.target.value })
            }
            rows={4}
            maxLength={500}
            className={
              validationErrors.businessDescription ? "border-destructive" : ""
            }
          />
          {validationErrors.businessDescription && (
            <p className="text-destructive text-sm">
              {validationErrors.businessDescription}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            {formData.businessDescription.length}/500 characters (minimum 10)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Back
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : "Continue to Verification"}
          </Button>
        </div>
      </form>
    </div>
  );
}
