import { describe, it, expect } from "vitest";
import {
  isValidUserId,
  isValidPlaceId,
  isValidCheckinStatus,
  unsafeCastToUserId,
  unsafeCastToPlaceId,
  latitudeSchema,
  longitudeSchema,
  sanitizedContentSchema,
  placeIdSchema,
  coordinatesSchema,
} from "./core";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================
// Type guards
// ============================================

describe("isValidUserId", () => {
  it("accepts a valid UUID", () => {
    expect(isValidUserId(VALID_UUID)).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(isValidUserId("not-a-uuid")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidUserId(123)).toBe(false);
    expect(isValidUserId(null)).toBe(false);
    expect(isValidUserId(undefined)).toBe(false);
  });
});

describe("isValidPlaceId", () => {
  it("accepts alphanumeric with underscores and hyphens", () => {
    expect(isValidPlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe(true);
    expect(isValidPlaceId("place_123-abc")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidPlaceId("")).toBe(false);
  });

  it("rejects strings with special characters", () => {
    expect(isValidPlaceId("place id!")).toBe(false);
    expect(isValidPlaceId("place@id")).toBe(false);
  });
});

describe("isValidCheckinStatus", () => {
  it("accepts valid statuses", () => {
    expect(isValidCheckinStatus("available")).toBe(true);
    expect(isValidCheckinStatus("busy")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isValidCheckinStatus("offline")).toBe(false);
    expect(isValidCheckinStatus("")).toBe(false);
  });
});

// ============================================
// Unsafe casts
// ============================================

describe("unsafeCastToUserId", () => {
  it("returns branded type for valid UUID", () => {
    expect(() => unsafeCastToUserId(VALID_UUID)).not.toThrow();
  });

  it("throws on invalid UUID", () => {
    expect(() => unsafeCastToUserId("bad")).toThrow();
  });
});

describe("unsafeCastToPlaceId", () => {
  it("returns branded type for valid place ID", () => {
    expect(() => unsafeCastToPlaceId("ChIJN1t_tDeuEmsR")).not.toThrow();
  });

  it("throws on empty string", () => {
    expect(() => unsafeCastToPlaceId("")).toThrow();
  });

  it("throws on special characters", () => {
    expect(() => unsafeCastToPlaceId("bad place!")).toThrow();
  });
});

// ============================================
// Latitude / Longitude schemas
// ============================================

describe("latitudeSchema", () => {
  it("accepts boundary values", () => {
    expect(latitudeSchema.safeParse(-90).success).toBe(true);
    expect(latitudeSchema.safeParse(90).success).toBe(true);
    expect(latitudeSchema.safeParse(0).success).toBe(true);
  });

  it("rejects out-of-range values", () => {
    expect(latitudeSchema.safeParse(-90.1).success).toBe(false);
    expect(latitudeSchema.safeParse(90.1).success).toBe(false);
  });
});

describe("longitudeSchema", () => {
  it("accepts boundary values", () => {
    expect(longitudeSchema.safeParse(-180).success).toBe(true);
    expect(longitudeSchema.safeParse(180).success).toBe(true);
    expect(longitudeSchema.safeParse(0).success).toBe(true);
  });

  it("rejects out-of-range values", () => {
    expect(longitudeSchema.safeParse(-180.1).success).toBe(false);
    expect(longitudeSchema.safeParse(180.1).success).toBe(false);
  });
});

// ============================================
// sanitizedContentSchema
// ============================================

describe("sanitizedContentSchema", () => {
  it("trims whitespace", () => {
    const result = sanitizedContentSchema.safeParse("  hello  ");
    expect(result.success).toBe(true);
    if (result.success) {
      // The branded value is the underlying string after transform
      expect(String(result.data)).toBe("hello");
    }
  });

  it("strips HTML tags", () => {
    const result = sanitizedContentSchema.safeParse("<b>bold</b> text");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(String(result.data)).toBe("bold text");
    }
  });

  it("rejects empty string", () => {
    expect(sanitizedContentSchema.safeParse("").success).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(sanitizedContentSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects HTML-only string (empty after strip)", () => {
    expect(sanitizedContentSchema.safeParse("<br><hr>").success).toBe(false);
  });
});

// ============================================
// placeIdSchema
// ============================================

describe("placeIdSchema", () => {
  it("accepts alphanumeric with underscore and hyphen", () => {
    expect(placeIdSchema.safeParse("abc_123-XYZ").success).toBe(true);
  });

  it("rejects special characters", () => {
    expect(placeIdSchema.safeParse("abc 123").success).toBe(false);
    expect(placeIdSchema.safeParse("abc@123").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(placeIdSchema.safeParse("").success).toBe(false);
  });
});

// ============================================
// coordinatesSchema
// ============================================

describe("coordinatesSchema", () => {
  it("accepts valid coordinates", () => {
    const result = coordinatesSchema.safeParse({
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    expect(
      coordinatesSchema.safeParse({ latitude: 91, longitude: 0 }).success,
    ).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(
      coordinatesSchema.safeParse({ latitude: 0, longitude: 181 }).success,
    ).toBe(false);
  });
});
