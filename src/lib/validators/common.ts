// src/lib/validators/common.ts
import { z } from "zod";

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

// UUID validation (for user IDs, session IDs)
export const uuidSchema = z.string().uuid("Invalid ID format");

// Place ID validation (Google Place IDs are alphanumeric with underscores)
export const placeIdSchema = z
  .string()
  .min(1, "Place ID is required")
  .max(255, "Place ID too long")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Invalid place ID format - only alphanumeric, underscore, and hyphen allowed",
  );

// Coordinates validation
export const coordinateSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
});

// Text content validation (for messages, topics)
export const messageContentSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(1000, "Message too long (max 1000 characters)")
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, "Message cannot be only whitespace");

export const topicSchema = z
  .string()
  .max(120, "Topic too long (max 120 characters)")
  .transform((str) => str.trim())
  .optional()
  .nullable();

// Place name/address validation
export const placeNameSchema = z
  .string()
  .min(1, "Place name is required")
  .max(255, "Place name too long")
  .transform((str) => str.trim());

export const addressSchema = z
  .string()
  .min(1, "Address is required")
  .max(511, "Address too long")
  .transform((str) => str.trim());

// Email validation
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .toLowerCase()
  .transform((str) => str.trim());

// Name validation (for user names)
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(255, "Name too long")
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, "Name cannot be only whitespace");

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize text input - removes HTML tags and trims whitespace
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim();
}

/**
 * Sanitize and validate a string input
 */
export function sanitizeAndValidate(
  input: unknown,
  schema: z.ZodString,
): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  const sanitized = sanitizeText(input);
  return schema.parse(sanitized);
}

/**
 * Validate and sanitize form data
 */
export function validateFormData<T extends z.ZodTypeAny>(
  formData: FormData,
  schema: T,
): z.infer<T> {
  const data: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      data[key] = sanitizeText(value);
    } else {
      data[key] = value;
    }
  }

  return schema.parse(data);
}

// ============================================
// URL/PATH VALIDATION
// ============================================

/**
 * Validate redirect URLs to prevent open redirect vulnerabilities
 */
export function validateRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url, process.env.NEXT_PUBLIC_APP_URL);

    // Only allow same-origin redirects
    return parsed.origin === process.env.NEXT_PUBLIC_APP_URL;
  } catch {
    return false;
  }
}

/**
 * Sanitize query parameters
 */
export function sanitizeQueryParam(
  param: string | string[] | undefined,
): string {
  if (Array.isArray(param)) {
    param = param[0];
  }

  if (!param) {
    return "";
  }

  return sanitizeText(param);
}

// ============================================
// XSS PREVENTION
// ============================================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}
