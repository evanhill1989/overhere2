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
// DOMAIN ENTITY TYPES
// ============================================

export type User = z.infer<typeof userSchema>;
export type Place = z.infer<typeof placeSchema>;
export type Checkin = z.infer<typeof checkinSchema>;
export type MessageRequest = z.infer<typeof messageRequestSchema>;
export type MessageSession = z.infer<typeof messageSessionSchema>;
export type Message = z.infer<typeof messageSchema>;
export type FailedRequest = z.infer<typeof failedRequestSchema>;

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
};
