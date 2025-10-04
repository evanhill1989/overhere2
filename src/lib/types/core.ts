//src/lib/type/core/ts

import { z } from "zod";

// ============================================
// STATUS ENUMS (Match your exact schema)
// ============================================

export const CHECKIN_STATUS = {
  AVAILABLE: "available",
  BUSY: "busy",
} as const;

export const MESSAGE_REQUEST_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELED: "canceled",
  EXPIRED: "expired",
} as const;

// ✅ NEW: Separate enum for message sessions
export const MESSAGE_SESSION_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
} as const;

export type CheckinStatus =
  (typeof CHECKIN_STATUS)[keyof typeof CHECKIN_STATUS];
export type MessageRequestStatus =
  (typeof MESSAGE_REQUEST_STATUS)[keyof typeof MESSAGE_REQUEST_STATUS];
export type MessageSessionStatus =
  (typeof MESSAGE_SESSION_STATUS)[keyof typeof MESSAGE_SESSION_STATUS];

// ============================================
// BRANDED SCHEMAS (Based on your actual schema)
// ============================================

// UUID-based IDs (users, sessions, requests) - matches your schema
export const userIdSchema = z
  .string()
  .uuid("User ID must be a valid UUID")
  .brand<"UserId">();

export const sessionIdSchema = z
  .string()
  .uuid("Session ID must be a valid UUID")
  .brand<"SessionId">();

export const requestIdSchema = z
  .string()
  .uuid("Request ID must be a valid UUID")
  .brand<"RequestId">();

// Serial integer IDs (checkins, messages, failed_requests)
export const checkinIdSchema = z
  .number()
  .int()
  .positive("Checkin ID must be positive")
  .brand<"CheckinId">();

export const messageIdSchema = z
  .number()
  .int()
  .positive("Message ID must be positive")
  .brand<"MessageId">();

export const failedRequestIdSchema = z
  .number()
  .int()
  .positive("Failed request ID must be positive")
  .brand<"FailedRequestId">();

// Place IDs (Google Place API format) - varchar(255) in your schema
export const placeIdSchema = z
  .string()
  .min(1, "Place ID cannot be empty")
  .max(255, "Place ID too long (max 255 characters)")
  // Google Place IDs are alphanumeric with underscores/hyphens
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid place ID format")
  .brand<"PlaceId">();

// Location schemas (match your double precision columns)
export const latitudeSchema = z
  .number()
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90")
  .brand<"Latitude">();

export const longitudeSchema = z
  .number()
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180")
  .brand<"Longitude">();

export const coordinatesSchema = z
  .object({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  })
  .brand<"ValidatedCoordinates">();

// Content schemas (match your exact varchar/text limits)
export const sanitizedContentSchema = z
  .string()
  .min(1, "Content cannot be empty")
  .max(10000, "Content too long") // text column, generous limit
  .transform((str) => str.trim().replace(/<[^>]*>/g, "")) // Remove HTML tags
  .refine((str) => str.length > 0, "Content cannot be only whitespace")
  .brand<"SanitizedContent">();

export const validatedTopicSchema = z
  .string()
  .max(120, "Topic too long (max 120 characters)") // matches varchar(120)
  .transform((str) => str.trim())
  .refine(
    (str) => str.length === 0 || str.length >= 2,
    "Topic must be empty or at least 2 characters",
  )
  .brand<"ValidatedTopic">()
  .nullable()
  .optional();

export const validatedEmailSchema = z
  .string()
  .email("Invalid email format")
  .max(255, "Email too long (max 255 characters)") // matches varchar(255)
  .toLowerCase()
  .transform((str) => str.trim())
  .brand<"ValidatedEmail">();

// Name validation (matches varchar(255))
export const validatedNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(255, "Name too long (max 255 characters)")
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, "Name cannot be only whitespace")
  .brand<"ValidatedName">();

// Place name/address validation (match your schema limits)
export const placeNameSchema = z
  .string()
  .min(1, "Place name is required")
  .max(255, "Place name too long (max 255 characters)")
  .transform((str) => str.trim())
  .brand<"ValidatedPlaceName">();

export const placeAddressSchema = z
  .string()
  .min(1, "Place address is required")
  .max(511, "Place address too long (max 511 characters)")
  .transform((str) => str.trim())
  .brand<"ValidatedPlaceAddress">();

// Primary type validation (varchar(255))
export const primaryTypeSchema = z
  .string()
  .max(255, "Primary type too long (max 255 characters)")
  .transform((str) => str.trim())
  .brand<"ValidatedPrimaryType">()
  .nullable()
  .optional();

// Error reason and details (for failed_message_requests)
export const errorReasonSchema = z
  .string()
  .min(1, "Error reason is required")
  .max(255, "Error reason too long (max 255 characters)")
  .brand<"ErrorReason">();

export const errorDetailsSchema = z
  .string()
  .max(10000, "Error details too long") // text column
  .brand<"ErrorDetails">()
  .nullable()
  .optional();

// Status schemas with proper enums
export const checkinStatusSchema = z.enum([
  CHECKIN_STATUS.AVAILABLE,
  CHECKIN_STATUS.BUSY,
] as const);

export const messageRequestStatusSchema = z.enum([
  MESSAGE_REQUEST_STATUS.PENDING,
  MESSAGE_REQUEST_STATUS.ACCEPTED,
  MESSAGE_REQUEST_STATUS.REJECTED,
  MESSAGE_REQUEST_STATUS.CANCELED,
  MESSAGE_REQUEST_STATUS.EXPIRED,
] as const);

export const messageSessionStatusSchema = z.enum([
  MESSAGE_SESSION_STATUS.ACTIVE,
  MESSAGE_SESSION_STATUS.EXPIRED,
] as const);

// ============================================
// TIMESTAMP SCHEMAS (All with timezone now)
// ============================================

export const timestampSchema = z
  .union([z.string(), z.date()])
  .transform((val) => new Date(val))
  .refine((date) => !isNaN(date.getTime()), "Invalid timestamp")
  .brand<"ValidatedTimestamp">();

// ============================================
// TYPE INFERENCE FROM SCHEMAS
// ============================================

export type UserId = z.infer<typeof userIdSchema>;
export type PlaceId = z.infer<typeof placeIdSchema>;
export type CheckinId = z.infer<typeof checkinIdSchema>;
export type SessionId = z.infer<typeof sessionIdSchema>;
export type RequestId = z.infer<typeof requestIdSchema>;
export type MessageId = z.infer<typeof messageIdSchema>;
export type FailedRequestId = z.infer<typeof failedRequestIdSchema>;

export type Latitude = z.infer<typeof latitudeSchema>;
export type Longitude = z.infer<typeof longitudeSchema>;
export type ValidatedCoordinates = z.infer<typeof coordinatesSchema>;

export type SanitizedContent = z.infer<typeof sanitizedContentSchema>;
export type ValidatedTopic = z.infer<typeof validatedTopicSchema>;
export type ValidatedEmail = z.infer<typeof validatedEmailSchema>;
export type ValidatedName = z.infer<typeof validatedNameSchema>;
export type ValidatedPlaceName = z.infer<typeof placeNameSchema>;
export type ValidatedPlaceAddress = z.infer<typeof placeAddressSchema>;
export type ValidatedPrimaryType = z.infer<typeof primaryTypeSchema>;
export type ValidatedTimestamp = z.infer<typeof timestampSchema>;

export type ErrorReason = z.infer<typeof errorReasonSchema>;
export type ErrorDetails = z.infer<typeof errorDetailsSchema>;

// ============================================
// COMPOSITE VALIDATION SCHEMAS
// ============================================

// Complete user validation
export const createUserSchema = z.object({
  id: userIdSchema,
  name: validatedNameSchema,
  email: validatedEmailSchema,
});

// Complete checkin validation
export const createCheckinSchema = z.object({
  userId: userIdSchema,
  placeId: placeIdSchema,
  placeName: placeNameSchema,
  placeAddress: placeAddressSchema,
  coordinates: coordinatesSchema.optional().nullable(),
  checkinStatus: checkinStatusSchema,
  topic: validatedTopicSchema,
  isActive: z.boolean().default(true),
});

// Message request validation
export const createMessageRequestSchema = z.object({
  initiatorId: userIdSchema,
  initiateeId: userIdSchema,
  placeId: placeIdSchema,
});

// Message session validation
export const createMessageSessionSchema = z.object({
  placeId: placeIdSchema,
  initiatorId: userIdSchema,
  initiateeId: userIdSchema,
  sourceRequestId: requestIdSchema.optional().nullable(),
  status: messageSessionStatusSchema.default(MESSAGE_SESSION_STATUS.ACTIVE),
});

// Message validation
export const createMessageSchema = z.object({
  sessionId: sessionIdSchema,
  senderCheckinId: checkinIdSchema,
  content: sanitizedContentSchema,
});

// Failed request validation
export const createFailedRequestSchema = z.object({
  initiatorId: userIdSchema,
  initiateeId: userIdSchema,
  placeId: placeIdSchema.optional().nullable(),
  reason: errorReasonSchema,
  errorDetails: errorDetailsSchema,
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Type guards for runtime checks
export function isValidUserId(value: unknown): value is UserId {
  return userIdSchema.safeParse(value).success;
}

export function isValidPlaceId(value: unknown): value is PlaceId {
  return placeIdSchema.safeParse(value).success;
}

export function isValidCheckinStatus(value: unknown): value is CheckinStatus {
  return checkinStatusSchema.safeParse(value).success;
}

export function isValidMessageRequestStatus(
  value: unknown,
): value is MessageRequestStatus {
  return messageRequestStatusSchema.safeParse(value).success;
}

export function isValidMessageSessionStatus(
  value: unknown,
): value is MessageSessionStatus {
  return messageSessionStatusSchema.safeParse(value).success;
}

export function isValidCoordinates(
  value: unknown,
): value is ValidatedCoordinates {
  return coordinatesSchema.safeParse(value).success;
}

// Safe casting functions (when you have pre-validated data)
export function unsafeCastToUserId(id: string): UserId {
  return userIdSchema.parse(id);
}

export function unsafeCastToPlaceId(id: string): PlaceId {
  return placeIdSchema.parse(id);
}

export function unsafeCastToCheckinId(id: number): CheckinId {
  return checkinIdSchema.parse(id);
}

// ============================================
// EXPORTS FOR CLEAN IMPORTS
// ============================================
