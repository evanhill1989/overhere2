// src/lib/types/database.ts
import { z } from "zod";
import {
  // Branded type schemas
  userIdSchema,
  placeIdSchema,
  checkinIdSchema,
  sessionIdSchema,
  requestIdSchema,
  messageIdSchema,
  failedRequestIdSchema,

  // Value schemas
  validatedNameSchema,
  validatedEmailSchema,
  placeNameSchema,
  placeAddressSchema,
  primaryTypeSchema,
  validatedTopicSchema,
  sanitizedContentSchema,
  checkinStatusSchema,
  messageRequestStatusSchema,
  messageSessionStatusSchema,
  timestampSchema,
  errorReasonSchema,
  errorDetailsSchema,

  // Branded types (for re-export)
  type UserId,
  type PlaceId,
  type CheckinId,
  type SessionId,
  type RequestId,
  type MessageId,
  type FailedRequestId,
  type CheckinStatus,
  type MessageRequestStatus,
  type MessageSessionStatus,
  type ValidatedCoordinates,
  type SanitizedContent,
  type ValidatedTopic,
  type ValidatedName,
  type ValidatedEmail,
  type ValidatedPlaceName,
  type ValidatedPlaceAddress,
  type ValidatedPrimaryType,
  type ValidatedTimestamp,
  type ErrorReason,
  type ErrorDetails,

  // Constants
  CHECKIN_STATUS,
  MESSAGE_REQUEST_STATUS,
  MESSAGE_SESSION_STATUS,

  // Owner Dashboard branded types
  claimIdSchema,
  promotionIdSchema,
  verifiedOwnerIdSchema,

  // Owner Dashboard value schemas
  phoneNumberSchema,
  verificationCodeSchema,
  stripeCustomerIdSchema,
  stripeSubscriptionIdSchema,
  promotionTitleSchema,
  promotionMessageSchema,
  descriptionOverrideSchema,
  announcementTextSchema,

  // Owner Dashboard status schemas
  claimStatusSchema,
  verificationMethodSchema,
  ownerRoleSchema,
  subscriptionStatusSchema,
  promotionTypeSchema,
  promotionStatusSchema,

  // Owner Dashboard branded type exports
  type ClaimId,
  type PromotionId,
  type VerifiedOwnerId,
  type ClaimStatus,
  type VerificationMethod,
  type OwnerRole,
  type SubscriptionStatus,
  type PromotionType,
  type PromotionStatus,
  type ValidatedPhoneNumber,
  type VerificationCode,
  type StripeCustomerId,
  type StripeSubscriptionId,
  type PromotionTitle,
  type PromotionMessage,
  type DescriptionOverride,
  type AnnouncementText,

  // Owner Dashboard constants
  CLAIM_STATUS,
  VERIFICATION_METHOD,
  OWNER_ROLE,
  SUBSCRIPTION_STATUS,
  PROMOTION_TYPE,
  PROMOTION_STATUS,
} from "./core";

// ============================================
// DOMAIN ENTITY SCHEMAS
// ============================================

// User
export const userSchema = z.object({
  id: userIdSchema,
  name: validatedNameSchema,
  email: validatedEmailSchema,
  createdAt: timestampSchema,
});

// Place
export const placeSchema = z.object({
  id: placeIdSchema,
  name: placeNameSchema,
  address: placeAddressSchema,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  lastFetchedAt: timestampSchema,
  isVerified: z.boolean(),
  primaryType: primaryTypeSchema,
});

// Checkin
export const checkinSchema = z.object({
  id: checkinIdSchema,
  createdAt: timestampSchema,
  userId: userIdSchema,
  placeId: placeIdSchema,
  placeName: placeNameSchema,
  placeAddress: placeAddressSchema,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  checkinStatus: checkinStatusSchema,
  topic: validatedTopicSchema,
  isActive: z.boolean(),
  checkedOutAt: timestampSchema.nullable(),
});

// Message Session Request
export const messageRequestSchema = z.object({
  id: requestIdSchema,
  initiatorId: userIdSchema,
  initiateeId: userIdSchema,
  placeId: placeIdSchema,
  status: messageRequestStatusSchema,
  createdAt: timestampSchema,
  respondedAt: timestampSchema.nullable().optional(),
});

// Message Session
export const messageSessionSchema = z.object({
  id: sessionIdSchema,
  placeId: placeIdSchema,
  initiatorId: userIdSchema,
  initiateeId: userIdSchema,
  sourceRequestId: requestIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  status: messageSessionStatusSchema,
  expiresAt: timestampSchema.nullable().optional(),
  closedAt: timestampSchema.nullable().optional(),
});

// Message
export const messageSchema = z.object({
  id: messageIdSchema,
  sessionId: sessionIdSchema,
  senderCheckinId: checkinIdSchema,
  content: sanitizedContentSchema,
  createdAt: timestampSchema,
  deliveredAt: timestampSchema.nullable().optional(),
  readAt: timestampSchema.nullable().optional(),
});

// Failed Message Request
export const failedRequestSchema = z.object({
  id: failedRequestIdSchema,
  initiatorId: userIdSchema,
  initiateeId: userIdSchema,
  placeId: placeIdSchema.nullable().optional(),
  reason: errorReasonSchema,
  errorDetails: errorDetailsSchema,
  createdAt: timestampSchema,
});

// ============================================
// OWNER DASHBOARD DOMAIN ENTITY SCHEMAS
// ============================================

// Place Claim
export const placeClaimSchema = z.object({
  id: claimIdSchema,
  placeId: placeIdSchema,
  userId: userIdSchema,
  status: claimStatusSchema,
  verificationMethod: verificationMethodSchema,
  phoneNumber: phoneNumberSchema.nullable().optional(),
  verificationCode: verificationCodeSchema.nullable().optional(),
  verificationCodeExpiresAt: timestampSchema.nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  submittedAt: timestampSchema,
  verifiedAt: timestampSchema.nullable().optional(),
});

// Verified Owner
export const verifiedOwnerSchema = z.object({
  id: verifiedOwnerIdSchema,
  placeId: placeIdSchema,
  userId: userIdSchema,
  role: ownerRoleSchema,
  stripeCustomerId: stripeCustomerIdSchema.nullable().optional(),
  stripeSubscriptionId: stripeSubscriptionIdSchema.nullable().optional(),
  subscriptionStatus: subscriptionStatusSchema,
  subscriptionCurrentPeriodEnd: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
});

// Place Owner Settings
export const placeOwnerSettingsSchema = z.object({
  placeId: placeIdSchema, // PK
  descriptionOverride: descriptionOverrideSchema,
  announcementText: announcementTextSchema,
  announcementExpiresAt: timestampSchema.nullable().optional(),
  contactEmail: validatedEmailSchema.nullable().optional(),
  contactPhone: phoneNumberSchema.nullable().optional(),
  lastUpdatedBy: userIdSchema.nullable().optional(),
  lastUpdatedAt: timestampSchema,
});

// Promotion
export const promotionSchema = z.object({
  id: promotionIdSchema,
  placeId: placeIdSchema,
  type: promotionTypeSchema,
  title: promotionTitleSchema.nullable().optional(),
  message: promotionMessageSchema.nullable().optional(),
  startAt: timestampSchema,
  endAt: timestampSchema,
  status: promotionStatusSchema,
  createdBy: userIdSchema,
  createdAt: timestampSchema,
});

// ============================================
// DOMAIN ENTITY TYPES
// ============================================

export type User = z.infer<typeof userSchema>;
export type Place = z.infer<typeof placeSchema>;
export type Checkin = z.infer<typeof checkinSchema>;
export type MessageRequest = z.infer<typeof messageRequestSchema>;
export type MessageSession = z.infer<typeof messageSessionSchema>;
export type Message = z.infer<typeof messageSchema>;
export type FailedRequest = z.infer<typeof failedRequestSchema>;
// Owner Dashboard domain entity types
export type PlaceClaim = z.infer<typeof placeClaimSchema>;
export type VerifiedOwner = z.infer<typeof verifiedOwnerSchema>;
export type PlaceOwnerSettings = z.infer<typeof placeOwnerSettingsSchema>;
export type Promotion = z.infer<typeof promotionSchema>;

export type DatabaseCheckin = {
  id: string;
  user_id: string;
  place_id: string;
  place_name: string;
  place_address: string;
  latitude: number | null;
  longitude: number | null;
  checkin_status: "available" | "busy";
  topic: string | null;
  is_active: boolean;
  created_at: string;
  checked_out_at: string | null;
};

//Database Message Request (snake_case from Supabase)
export type DatabaseMessageRequest = {
  id: string;
  initiator_id: string;
  initiatee_id: string;
  place_id: string;
  status: "pending" | "accepted" | "rejected" | "canceled" | "expired"; // Assuming these statuses
  created_at: string;
  responded_at: string | null;
};

//Database Message Session (snake_case from Supabase)
export type DatabaseMessageSession = {
  id: string;
  place_id: string;
  initiator_id: string;
  initiatee_id: string;
  source_request_id: string | null;
  created_at: string;
  status: "active" | "expired"; // Matches your schema
  expires_at: string | null;
  closed_at: string | null;
};

// REST API response (camelCase from /api/checkins)
export type ApiCheckin = {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  latitude: number | null;
  longitude: number | null;
  checkinStatus: "available" | "busy";
  topic: string | null;
  isActive: boolean;
  createdAt: string;
  checkedOutAt: string | null;
};

// export type DatabaseMessage = {

// }

// ============================================
// FORM INPUT SCHEMAS (for server actions)
// ============================================

// Checkin form input
export const checkinFormSchema = z.object({
  placeId: z.string(),
  placeName: z.string(),
  placeAddress: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  topic: z.string().nullable().optional(),
  checkinStatus: z.enum([
    CHECKIN_STATUS.AVAILABLE,
    CHECKIN_STATUS.BUSY,
  ] as const),
});

// Message request form input
export const messageRequestFormSchema = z.object({
  initiatorId: z.string(),
  initiateeId: z.string(),
  placeId: z.string(),
});

// Send message form input
export const sendMessageFormSchema = z.object({
  sessionId: z.string(),
  senderCheckinId: z.string(),
  content: z.string(),
});

// Respond to request form input
export const respondToRequestFormSchema = z.object({
  requestId: z.string(),
  response: z.enum([
    MESSAGE_REQUEST_STATUS.ACCEPTED,
    MESSAGE_REQUEST_STATUS.REJECTED,
    MESSAGE_REQUEST_STATUS.CANCELED,
  ] as const),
});

// Update checkin
export const updateCheckinSchema = z.object({
  checkinStatus: checkinStatusSchema.optional(),
  topic: validatedTopicSchema,
  isActive: z.boolean().optional(),
});

// Update message session
export const updateMessageSessionSchema = z.object({
  status: messageSessionStatusSchema.optional(),
  expiresAt: timestampSchema.nullable().optional(),
  closedAt: timestampSchema.nullable().optional(),
});

// ============================================
// OWNER DASHBOARD FORM INPUT SCHEMAS
// ============================================

// Claim place form input
export const claimPlaceFormSchema = z.object({
  placeId: z.string(),
  verificationMethod: z.enum([
    VERIFICATION_METHOD.PHONE,
    VERIFICATION_METHOD.MAIL,
    VERIFICATION_METHOD.MANUAL,
  ] as const),
  phoneNumber: z.string().optional(),
});

// Verify phone code form input
export const verifyPhoneCodeFormSchema = z.object({
  claimId: z.string(),
  code: z.string(),
});

// Update owner settings form input
export const updateOwnerSettingsFormSchema = z.object({
  placeId: z.string(),
  descriptionOverride: z.string().nullable().optional(),
  announcementText: z.string().nullable().optional(),
  announcementExpiresAt: z.string().nullable().optional(), // ISO string
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
});

// Create promotion form input
export const createPromotionFormSchema = z.object({
  placeId: z.string(),
  type: z.enum([
    PROMOTION_TYPE.FEATURED_MESSAGE,
    PROMOTION_TYPE.PRIORITY_SORT,
    PROMOTION_TYPE.HIGHLIGHT_BADGE,
  ] as const),
  title: z.string().optional(),
  message: z.string().optional(),
  startAt: z.string(), // ISO string
  endAt: z.string(), // ISO string
});

// Update promotion form input
export const updatePromotionFormSchema = z.object({
  promotionId: z.string(),
  status: z.enum([
    PROMOTION_STATUS.SCHEDULED,
    PROMOTION_STATUS.ACTIVE,
    PROMOTION_STATUS.EXPIRED,
    PROMOTION_STATUS.CANCELED,
  ] as const),
});

// ============================================
// UTILITY TYPES
// ============================================

// Partial entity types for updates
export type UpdateCheckin = Partial<
  Pick<Checkin, "checkinStatus" | "topic" | "isActive">
>;
export type UpdateMessageSession = Partial<
  Pick<MessageSession, "status" | "expiresAt" | "closedAt">
>;

// Create input types (omit auto-generated fields)
export type CreateUser = Omit<User, "createdAt">;
export type CreatePlace = Omit<Place, "lastFetchedAt" | "isVerified">;
export type CreateCheckin = Omit<Checkin, "id" | "createdAt" | "checkedOutAt">;
export type CreateMessageRequest = Omit<
  MessageRequest,
  "id" | "createdAt" | "respondedAt" | "status"
>;
export type CreateMessageSession = Omit<
  MessageSession,
  "id" | "createdAt" | "expiresAt" | "closedAt"
>;
export type CreateMessage = Omit<
  Message,
  "id" | "createdAt" | "deliveredAt" | "readAt"
>;
export type CreateFailedRequest = Omit<FailedRequest, "id" | "createdAt">;

// Owner Dashboard create types
export type CreatePlaceClaim = Omit<
  PlaceClaim,
  | "id"
  | "submittedAt"
  | "verifiedAt"
  | "verificationCode"
  | "verificationCodeExpiresAt"
>;
export type CreateVerifiedOwner = Omit<VerifiedOwner, "id" | "createdAt">;
export type CreatePlaceOwnerSettings = Omit<
  PlaceOwnerSettings,
  "lastUpdatedAt"
>;
export type CreatePromotion = Omit<Promotion, "id" | "createdAt" | "status">;

// ============================================
// Query Keys
// ============================================
export type MessageRequestsQueryKey = ["messageRequests", UserId, PlaceId];

// ============================================
// RE-EXPORTS
// ============================================

export {
  // Branded types
  type UserId,
  type PlaceId,
  type CheckinId,
  type SessionId,
  type RequestId,
  type MessageId,
  type FailedRequestId,
  type CheckinStatus,
  type MessageRequestStatus,
  type MessageSessionStatus,
  type ValidatedCoordinates,
  type SanitizedContent,
  type ValidatedTopic,
  type ValidatedName,
  type ValidatedEmail,
  type ValidatedPlaceName,
  type ValidatedPlaceAddress,
  type ValidatedPrimaryType,
  type ValidatedTimestamp,
  type ErrorReason,
  type ErrorDetails,

  // Constants
  CHECKIN_STATUS,
  MESSAGE_REQUEST_STATUS,
  MESSAGE_SESSION_STATUS,

  // Schemas from core (for validation)
  userIdSchema,
  placeIdSchema,
  checkinIdSchema,
  sessionIdSchema,
  requestIdSchema,
  messageIdSchema,
  failedRequestIdSchema, // ✅ Add this
  timestampSchema, // ✅ Add this
  sanitizedContentSchema, // ✅ Add this
  validatedTopicSchema, // ✅ Add this
  messageRequestStatusSchema, // ✅ Add this
  messageSessionStatusSchema, // ✅ Add this
  checkinStatusSchema, // ✅ Add this

  // Owner Dashboard branded types
  type ClaimId,
  type PromotionId,
  type VerifiedOwnerId,
  type ClaimStatus,
  type VerificationMethod,
  type OwnerRole,
  type SubscriptionStatus,
  type PromotionType,
  type PromotionStatus,
  type ValidatedPhoneNumber,
  type VerificationCode,
  type StripeCustomerId,
  type StripeSubscriptionId,
  type PromotionTitle,
  type PromotionMessage,
  type DescriptionOverride,
  type AnnouncementText,

  // Owner Dashboard constants
  CLAIM_STATUS,
  VERIFICATION_METHOD,
  OWNER_ROLE,
  SUBSCRIPTION_STATUS,
  PROMOTION_TYPE,
  PROMOTION_STATUS,

  // Owner Dashboard schemas
  claimIdSchema,
  promotionIdSchema,
  verifiedOwnerIdSchema,
  claimStatusSchema,
  verificationMethodSchema,
  ownerRoleSchema,
  subscriptionStatusSchema,
  promotionTypeSchema,
  promotionStatusSchema,
};
