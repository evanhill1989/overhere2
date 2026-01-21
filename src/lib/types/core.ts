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
// OWNER DASHBOARD STATUS ENUMS
// ============================================

export const CLAIM_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
} as const;

export const VERIFICATION_METHOD = {
  PHONE: "phone",
  MAIL: "mail",
  MANUAL: "manual",
} as const;

export const OWNER_ROLE = {
  OWNER: "owner",
  MANAGER: "manager",
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  TRIALING: "trialing",
} as const;

export const PROMOTION_TYPE = {
  FEATURED_MESSAGE: "featured_message",
  PRIORITY_SORT: "priority_sort",
  HIGHLIGHT_BADGE: "highlight_badge",
} as const;

export const PROMOTION_STATUS = {
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELED: "canceled",
} as const;

export type ClaimStatus = (typeof CLAIM_STATUS)[keyof typeof CLAIM_STATUS];
export type VerificationMethod =
  (typeof VERIFICATION_METHOD)[keyof typeof VERIFICATION_METHOD];
export type OwnerRole = (typeof OWNER_ROLE)[keyof typeof OWNER_ROLE];
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
export type PromotionType =
  (typeof PROMOTION_TYPE)[keyof typeof PROMOTION_TYPE];
export type PromotionStatus =
  (typeof PROMOTION_STATUS)[keyof typeof PROMOTION_STATUS];

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
  .string()
  .uuid("Checkin ID must be a valid UUID")
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

// Owner Dashboard IDs (UUID-based)
export const claimIdSchema = z
  .string()
  .uuid("Claim ID must be a valid UUID")
  .brand<"ClaimId">();

export const promotionIdSchema = z
  .string()
  .uuid("Promotion ID must be a valid UUID")
  .brand<"PromotionId">();

export const verifiedOwnerIdSchema = z
  .string()
  .uuid("Verified Owner ID must be a valid UUID")
  .brand<"VerifiedOwnerId">();

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

export const coordsSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  // These are often provided by the browser's Geolocation API
  accuracy: z.number().positive().optional(),
  timestamp: z.number().optional(), // Represents pos.timestamp
});

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

// Phone number validation (E.164 format)
export const phoneNumberSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format (E.164)")
  .max(20, "Phone number too long")
  .brand<"ValidatedPhoneNumber">();

// Verification code (6-digit numeric)
export const verificationCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Verification code must be 6 digits")
  .brand<"VerificationCode">();

// Stripe IDs
export const stripeCustomerIdSchema = z
  .string()
  .regex(/^cus_[A-Za-z0-9]+$/, "Invalid Stripe customer ID")
  .max(255, "Stripe customer ID too long")
  .brand<"StripeCustomerId">();

export const stripeSubscriptionIdSchema = z
  .string()
  .regex(/^sub_[A-Za-z0-9]+$/, "Invalid Stripe subscription ID")
  .max(255, "Stripe subscription ID too long")
  .brand<"StripeSubscriptionId">();

// Promotion content
export const promotionTitleSchema = z
  .string()
  .min(1, "Promotion title cannot be empty")
  .max(255, "Promotion title too long (max 255 characters)")
  .transform((str) => str.trim())
  .brand<"PromotionTitle">();

export const promotionMessageSchema = z
  .string()
  .min(1, "Promotion message cannot be empty")
  .max(10000, "Promotion message too long")
  .transform((str) => str.trim())
  .brand<"PromotionMessage">();

// Description override for places
export const descriptionOverrideSchema = z
  .string()
  .max(10000, "Description too long")
  .transform((str) => str.trim())
  .brand<"DescriptionOverride">()
  .nullable()
  .optional();

// Announcement text
export const announcementTextSchema = z
  .string()
  .max(10000, "Announcement too long")
  .transform((str) => str.trim())
  .brand<"AnnouncementText">()
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

// Owner Dashboard status schemas
export const claimStatusSchema = z.enum([
  CLAIM_STATUS.PENDING,
  CLAIM_STATUS.VERIFIED,
  CLAIM_STATUS.REJECTED,
] as const);

export const verificationMethodSchema = z.enum([
  VERIFICATION_METHOD.PHONE,
  VERIFICATION_METHOD.MAIL,
  VERIFICATION_METHOD.MANUAL,
] as const);

export const ownerRoleSchema = z.enum([
  OWNER_ROLE.OWNER,
  OWNER_ROLE.MANAGER,
] as const);

export const subscriptionStatusSchema = z.enum([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.PAST_DUE,
  SUBSCRIPTION_STATUS.CANCELED,
  SUBSCRIPTION_STATUS.TRIALING,
] as const);

export const promotionTypeSchema = z.enum([
  PROMOTION_TYPE.FEATURED_MESSAGE,
  PROMOTION_TYPE.PRIORITY_SORT,
  PROMOTION_TYPE.HIGHLIGHT_BADGE,
] as const);

export const promotionStatusSchema = z.enum([
  PROMOTION_STATUS.SCHEDULED,
  PROMOTION_STATUS.ACTIVE,
  PROMOTION_STATUS.EXPIRED,
  PROMOTION_STATUS.CANCELED,
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

export type Coords = z.infer<typeof coordsSchema>;

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

// Owner Dashboard branded types
export type ClaimId = z.infer<typeof claimIdSchema>;
export type PromotionId = z.infer<typeof promotionIdSchema>;
export type VerifiedOwnerId = z.infer<typeof verifiedOwnerIdSchema>;

export type ValidatedPhoneNumber = z.infer<typeof phoneNumberSchema>;
export type VerificationCode = z.infer<typeof verificationCodeSchema>;
export type StripeCustomerId = z.infer<typeof stripeCustomerIdSchema>;
export type StripeSubscriptionId = z.infer<typeof stripeSubscriptionIdSchema>;

export type PromotionTitle = z.infer<typeof promotionTitleSchema>;
export type PromotionMessage = z.infer<typeof promotionMessageSchema>;
export type DescriptionOverride = z.infer<typeof descriptionOverrideSchema>;
export type AnnouncementText = z.infer<typeof announcementTextSchema>;

// Business email validation
export const businessEmailSchema = z
  .string()
  .email("Invalid email format")
  .max(255, "Email too long (max 255 characters)")
  .toLowerCase()
  .transform((str) => str.trim())
  .brand<"BusinessEmail">();

// Business description (for claim applications)
export const businessDescriptionSchema = z
  .string()
  .min(10, "Description must be at least 10 characters")
  .max(500, "Description too long (max 500 characters)")
  .transform((str) => str.trim())
  .brand<"BusinessDescription">();

// Years at location enum
export const YEARS_AT_LOCATION = {
  LESS_THAN_ONE: "less_than_1",
  ONE_TO_TWO: "1-2",
  THREE_TO_FIVE: "3-5",
  MORE_THAN_FIVE: "5+",
} as const;

export type YearsAtLocation =
  (typeof YEARS_AT_LOCATION)[keyof typeof YEARS_AT_LOCATION];

export const yearsAtLocationSchema = z.enum([
  YEARS_AT_LOCATION.LESS_THAN_ONE,
  YEARS_AT_LOCATION.ONE_TO_TWO,
  YEARS_AT_LOCATION.THREE_TO_FIVE,
  YEARS_AT_LOCATION.MORE_THAN_FIVE,
] as const);

// IP Address validation
export const ipAddressSchema = z
  .string()
  .refine(
    (ip) => {
      // IPv4 or IPv6 validation
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
      return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    },
    { message: "Invalid IP address format" },
  )
  .brand<"IpAddress">();

// User agent string
export const userAgentSchema = z
  .string()
  .max(1000, "User agent too long")
  .brand<"UserAgent">();

// Fraud score (0-100)
export const fraudScoreSchema = z
  .number()
  .int()
  .min(0, "Fraud score must be at least 0")
  .max(100, "Fraud score must be at most 100")
  .brand<"FraudScore">();

// Audit log action types
export const CLAIM_AUDIT_ACTIONS = {
  CLAIM_STARTED: "claim_started",
  ELIGIBILITY_ACCEPTED: "eligibility_accepted",
  BUSINESS_INFO_SUBMITTED: "business_info_submitted",
  PHONE_CODE_SENT: "phone_code_sent",
  PHONE_CODE_VERIFIED: "phone_code_verified",
  PHONE_CODE_FAILED: "phone_code_failed",
  CLAIM_SUBMITTED: "claim_submitted",
  CLAIM_APPROVED: "claim_approved",
  CLAIM_REJECTED: "claim_rejected",
  CLAIM_CANCELED: "claim_canceled",
  ADMIN_REVIEW_STARTED: "admin_review_started",
  ADMIN_NOTES_ADDED: "admin_notes_added",
} as const;

export type ClaimAuditAction =
  (typeof CLAIM_AUDIT_ACTIONS)[keyof typeof CLAIM_AUDIT_ACTIONS];

export const claimAuditActionSchema = z.enum([
  CLAIM_AUDIT_ACTIONS.CLAIM_STARTED,
  CLAIM_AUDIT_ACTIONS.ELIGIBILITY_ACCEPTED,
  CLAIM_AUDIT_ACTIONS.BUSINESS_INFO_SUBMITTED,
  CLAIM_AUDIT_ACTIONS.PHONE_CODE_SENT,
  CLAIM_AUDIT_ACTIONS.PHONE_CODE_VERIFIED,
  CLAIM_AUDIT_ACTIONS.PHONE_CODE_FAILED,
  CLAIM_AUDIT_ACTIONS.CLAIM_SUBMITTED,
  CLAIM_AUDIT_ACTIONS.CLAIM_APPROVED,
  CLAIM_AUDIT_ACTIONS.CLAIM_REJECTED,
  CLAIM_AUDIT_ACTIONS.CLAIM_CANCELED,
  CLAIM_AUDIT_ACTIONS.ADMIN_REVIEW_STARTED,
  CLAIM_AUDIT_ACTIONS.ADMIN_NOTES_ADDED,
] as const);

// Branded type exports
export type BusinessEmail = z.infer<typeof businessEmailSchema>;
export type BusinessDescription = z.infer<typeof businessDescriptionSchema>;
export type IpAddress = z.infer<typeof ipAddressSchema>;
export type UserAgent = z.infer<typeof userAgentSchema>;
export type FraudScore = z.infer<typeof fraudScoreSchema>;

// Enhanced Place Claim Schema (with new fields)
export const createPlaceClaimSchemaEnhanced = z.object({
  placeId: placeIdSchema,
  userId: userIdSchema,
  verificationMethod: verificationMethodSchema,
  role: ownerRoleSchema.default(OWNER_ROLE.OWNER),
  phoneNumber: phoneNumberSchema.optional().nullable(),
  businessEmail: businessEmailSchema.optional().nullable(),
  businessDescription: businessDescriptionSchema.optional().nullable(),
  yearsAtLocation: yearsAtLocationSchema.optional().nullable(),
  checkinIdAtClaim: checkinIdSchema.optional().nullable(),
  ipAddress: ipAddressSchema.optional().nullable(),
  userAgent: userAgentSchema.optional().nullable(),
});

// Submit business info (Step 3 of verification flow)
export const submitBusinessInfoSchema = z.object({
  claimId: claimIdSchema,
  role: ownerRoleSchema,
  businessEmail: businessEmailSchema,
  businessDescription: businessDescriptionSchema,
  yearsAtLocation: yearsAtLocationSchema,
  phoneNumber: phoneNumberSchema,
});

// Verify phone code (Step 4 of verification flow)
export const verifyPhoneCodeSchema = z.object({
  claimId: claimIdSchema,
  code: verificationCodeSchema,
});

// Create audit log entry
export const createAuditLogSchema = z.object({
  claimId: claimIdSchema,
  action: claimAuditActionSchema,
  actorId: userIdSchema.optional().nullable(),
  metadata: z.string().optional().nullable(), // JSON string
});

// Admin review claim
export const adminReviewClaimSchema = z.object({
  claimId: claimIdSchema,
  action: z.enum([CLAIM_STATUS.VERIFIED, CLAIM_STATUS.REJECTED] as const),
  rejectionReason: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
});

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
// OWNER DASHBOARD COMPOSITE SCHEMAS
// ============================================

// Claim place ownership
export const createPlaceClaimSchema = z.object({
  placeId: placeIdSchema,
  userId: userIdSchema,
  verificationMethod: verificationMethodSchema,
  phoneNumber: phoneNumberSchema.optional().nullable(),
});

// Update verified owner
export const updateVerifiedOwnerSchema = z.object({
  role: ownerRoleSchema.optional(),
  subscriptionStatus: subscriptionStatusSchema.optional(),
  subscriptionCurrentPeriodEnd: timestampSchema.optional().nullable(),
});

// Update place owner settings
export const updatePlaceOwnerSettingsSchema = z.object({
  placeId: placeIdSchema,
  descriptionOverride: descriptionOverrideSchema,
  announcementText: announcementTextSchema,
  announcementExpiresAt: timestampSchema.optional().nullable(),
  contactEmail: validatedEmailSchema.optional().nullable(),
  contactPhone: phoneNumberSchema.optional().nullable(),
  lastUpdatedBy: userIdSchema,
});

// Create promotion
export const createPromotionSchema = z.object({
  placeId: placeIdSchema,
  type: promotionTypeSchema,
  title: promotionTitleSchema.optional().nullable(),
  message: promotionMessageSchema.optional().nullable(),
  startAt: timestampSchema,
  endAt: timestampSchema,
  createdBy: userIdSchema,
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
