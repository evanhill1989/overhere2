// src/lib/types/api.ts

import { z } from "zod";
import {
  // Domain types
  User,
  Place,
  Checkin,
  MessageRequest,
  MessageSession,
  Message,
  FailedRequest,

  // Branded types
  UserId,
  PlaceId,
  CheckinId,
  SessionId,
  RequestId,
  MessageId,
  CheckinStatus,
  MessageRequestStatus,
  MessageSessionStatus,

  // Validation schemas
  checkinFormSchema,
  messageRequestFormSchema,
  sendMessageFormSchema,
  respondToRequestFormSchema,
  updateCheckinSchema,
  updateMessageSessionSchema,
  userIdSchema,
  placeIdSchema,

  // Constants
  CHECKIN_STATUS,
  MESSAGE_REQUEST_STATUS,
  MESSAGE_SESSION_STATUS,
} from "./database";
import { coordinatesSchema } from "./core";

// ============================================
// CORE API RESPONSE TYPES
// ============================================

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
};

export type ApiError = {
  success: false;
  error: string;
  code?:
    | "VALIDATION_ERROR"
    | "AUTHENTICATION_ERROR"
    | "AUTHORIZATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMIT_EXCEEDED"
    | "INTERNAL_ERROR"
    | "EXTERNAL_API_ERROR";
  details?: Record<string, unknown>;
  timestamp?: string;
  requestId?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Helper type for paginated responses
export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

// ============================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================

export type LoginRequest = {
  provider: "google";
  redirectTo?: string;
};

export type LoginResponse = ApiResponse<{
  redirectUrl: string;
}>;

export type GetUserProfileResponse = ApiResponse<User>;

export type UpdateUserProfileRequest = {
  name?: string;
  email?: string;
};

export type UpdateUserProfileResponse = ApiResponse<User>;

// ============================================
// PLACE MANAGEMENT
// ============================================

export type SearchPlacesRequest = {
  query: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  maxResults?: number;
};

export type GetNearbyPlacesRequest = {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  types?: string[];
  maxResults?: number;
};

export type PlaceApiResult = {
  place_id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  primaryType?: string;
  isVerified?: boolean;
  rating?: number;
  priceLevel?: number;
  photos?: string[];
};

export type SearchPlacesResponse = ApiResponse<PlaceApiResult[]>;
export type GetNearbyPlacesResponse = ApiResponse<PlaceApiResult[]>;

export type GetPlaceDetailsRequest = {
  placeId: PlaceId;
};

export type GetPlaceDetailsResponse = ApiResponse<Place>;

// ============================================
// CHECKIN MANAGEMENT
// ============================================

export type CreateCheckinRequest = z.infer<typeof checkinFormSchema>;

export type CreateCheckinResponse = ApiResponse<{
  checkinId: CheckinId;
  redirectUrl: string;
}>;

export type GetCheckinsRequest = {
  placeId: PlaceId;
  includeInactive?: boolean;
};

export type GetCheckinsResponse = ApiResponse<Checkin[]>;

export type UpdateCheckinRequest = {
  checkinId: CheckinId;
  updates: z.infer<typeof updateCheckinSchema>;
};

export type UpdateCheckinResponse = ApiResponse<Checkin>;

export type CheckoutRequest = {
  checkinId: CheckinId;
};

export type CheckoutResponse = ApiResponse<{
  checkedOutAt: string;
}>;

export type GetUserActiveCheckinsRequest = {
  userId: UserId;
};

export type GetUserActiveCheckinsResponse = ApiResponse<Checkin[]>;

// ============================================
// MESSAGE REQUEST MANAGEMENT
// ============================================

export type CreateMessageRequestRequest = z.infer<
  typeof messageRequestFormSchema
>;

export type CreateMessageRequestResponse = ApiResponse<{
  requestId: RequestId;
  status: MessageRequestStatus;
}>;

export type RespondToMessageRequestRequest = z.infer<
  typeof respondToRequestFormSchema
>;

export type RespondToMessageRequestResponse = ApiResponse<{
  requestId: RequestId;
  status: MessageRequestStatus;
  sessionId?: SessionId; // Included if accepted
}>;

export type GetMessageRequestsRequest = {
  userId: UserId;
  placeId?: PlaceId;
  status?: MessageRequestStatus;
  limit?: number;
};

export type GetMessageRequestsResponse = ApiResponse<MessageRequest[]>;

export type CancelMessageRequestRequest = {
  requestId: RequestId;
};

export type CancelMessageRequestResponse = ApiResponse<{
  requestId: RequestId;
  status: MessageRequestStatus;
}>;

// ============================================
// MESSAGE SESSION MANAGEMENT
// ============================================

export type GetMessageSessionRequest = {
  userId: UserId;
  placeId: PlaceId;
};

export type GetMessageSessionResponse = ApiResponse<MessageSession | null>;

export type GetUserMessageSessionsRequest = {
  userId: UserId;
  status?: MessageSessionStatus;
  limit?: number;
};

export type GetUserMessageSessionsResponse = ApiResponse<MessageSession[]>;

export type UpdateMessageSessionRequest = {
  sessionId: SessionId;
  updates: z.infer<typeof updateMessageSessionSchema>;
};

export type UpdateMessageSessionResponse = ApiResponse<MessageSession>;

export type CloseMessageSessionRequest = {
  sessionId: SessionId;
};

export type CloseMessageSessionResponse = ApiResponse<{
  sessionId: SessionId;
  closedAt: string;
}>;

// ============================================
// MESSAGE MANAGEMENT
// ============================================

export type SendMessageRequest = z.infer<typeof sendMessageFormSchema>;

export type SendMessageResponse = ApiResponse<{
  messageId: MessageId;
  message: Message;
}>;

export type GetMessagesRequest = {
  sessionId: SessionId;
  limit?: number;
  offset?: number;
  since?: string; // ISO timestamp
};

export type GetMessagesResponse = ApiResponse<Message[]>;

export type MarkMessageReadRequest = {
  messageId: MessageId;
};

export type MarkMessageReadResponse = ApiResponse<{
  messageId: MessageId;
  readAt: string;
}>;

export type GetUnreadMessageCountRequest = {
  userId: UserId;
  sessionId?: SessionId;
};

export type GetUnreadMessageCountResponse = ApiResponse<{
  count: number;
  sessions: Array<{
    sessionId: SessionId;
    unreadCount: number;
  }>;
}>;

// ============================================
// REAL-TIME EVENT TYPES
// ============================================

export type RealtimeEventType =
  | "checkin:created"
  | "checkin:updated"
  | "checkin:deleted"
  | "message_request:created"
  | "message_request:updated"
  | "message_session:created"
  | "message_session:updated"
  | "message:created"
  | "user:online"
  | "user:offline";

export type RealtimeEvent<T = unknown> = {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
  userId?: UserId;
  placeId?: PlaceId;
};

// Specific event payloads
export type CheckinCreatedEvent = RealtimeEvent<{
  checkin: Checkin;
}>;

export type CheckinUpdatedEvent = RealtimeEvent<{
  checkin: Checkin;
  changes: Partial<Checkin>;
}>;

export type CheckinDeletedEvent = RealtimeEvent<{
  checkinId: CheckinId;
  userId: UserId;
  placeId: PlaceId;
}>;

export type MessageRequestCreatedEvent = RealtimeEvent<{
  request: MessageRequest;
}>;

export type MessageRequestUpdatedEvent = RealtimeEvent<{
  request: MessageRequest;
  oldStatus: MessageRequestStatus;
  newStatus: MessageRequestStatus;
}>;

export type MessageSessionCreatedEvent = RealtimeEvent<{
  session: MessageSession;
}>;

export type MessageCreatedEvent = RealtimeEvent<{
  message: Message;
}>;

export type UserPresenceEvent = RealtimeEvent<{
  userId: UserId;
  status: "online" | "offline";
  lastSeen?: string;
  placeId?: PlaceId;
}>;

// ============================================
// ANALYTICS & MONITORING
// ============================================

export type AnalyticsMetricType =
  | "checkins"
  | "messages"
  | "sessions"
  | "failed_requests"
  | "active_users";

export type GetAnalyticsRequest = {
  startDate: string;
  endDate: string;
  metrics: AnalyticsMetricType[];
  groupBy?: "day" | "hour" | "place";
};
export type AnalyticsMetric = {
  metric: string;
  value: number;
  timestamp: string;
  dimensions?: Record<string, string>;
};

export type GetAnalyticsResponse = ApiResponse<AnalyticsMetric[]>;

export type GetFailedRequestsRequest = {
  startDate?: string;
  endDate?: string;
  reason?: string;
  limit?: number;
};

export type GetFailedRequestsResponse = ApiResponse<FailedRequest[]>;

// ============================================
// VALIDATION MIDDLEWARE HELPERS
// ============================================

export function validateApiRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T | ApiError {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        },
        timestamp: new Date().toISOString(),
      };
    }
    return {
      success: false,
      error: "Invalid request data",
      code: "VALIDATION_ERROR",
      timestamp: new Date().toISOString(),
    };
  }
}

export function createApiSuccess<T>(
  data: T,
  message?: string,
  meta?: ApiSuccess<T>["meta"],
): ApiSuccess<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function createApiError(
  error: string,
  code?: ApiError["code"],
  details?: Record<string, unknown>,
): ApiError {
  return {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// TYPE-SAFE API CLIENT INTERFACE
// ============================================

export interface TypedApiClient {
  // Authentication
  auth: {
    login: (req: LoginRequest) => Promise<LoginResponse>;
    logout: () => Promise<ApiResponse<object>>;
    getProfile: () => Promise<GetUserProfileResponse>;
    updateProfile: (
      req: UpdateUserProfileRequest,
    ) => Promise<UpdateUserProfileResponse>;
  };

  // Places
  places: {
    search: (req: SearchPlacesRequest) => Promise<SearchPlacesResponse>;
    getNearby: (
      req: GetNearbyPlacesRequest,
    ) => Promise<GetNearbyPlacesResponse>;
    getDetails: (
      req: GetPlaceDetailsRequest,
    ) => Promise<GetPlaceDetailsResponse>;
  };

  // Checkins
  checkins: {
    create: (req: CreateCheckinRequest) => Promise<CreateCheckinResponse>;
    getAtPlace: (req: GetCheckinsRequest) => Promise<GetCheckinsResponse>;
    update: (req: UpdateCheckinRequest) => Promise<UpdateCheckinResponse>;
    checkout: (req: CheckoutRequest) => Promise<CheckoutResponse>;
    getUserActive: (
      req: GetUserActiveCheckinsRequest,
    ) => Promise<GetUserActiveCheckinsResponse>;
  };

  // Message Requests
  messageRequests: {
    create: (
      req: CreateMessageRequestRequest,
    ) => Promise<CreateMessageRequestResponse>;
    respond: (
      req: RespondToMessageRequestRequest,
    ) => Promise<RespondToMessageRequestResponse>;
    cancel: (
      req: CancelMessageRequestRequest,
    ) => Promise<CancelMessageRequestResponse>;
    getForUser: (
      req: GetMessageRequestsRequest,
    ) => Promise<GetMessageRequestsResponse>;
  };

  // Message Sessions
  messageSessions: {
    getForUser: (
      req: GetMessageSessionRequest,
    ) => Promise<GetMessageSessionResponse>;
    getUserSessions: (
      req: GetUserMessageSessionsRequest,
    ) => Promise<GetUserMessageSessionsResponse>;
    update: (
      req: UpdateMessageSessionRequest,
    ) => Promise<UpdateMessageSessionResponse>;
    close: (
      req: CloseMessageSessionRequest,
    ) => Promise<CloseMessageSessionResponse>;
  };

  // Messages
  messages: {
    send: (req: SendMessageRequest) => Promise<SendMessageResponse>;
    getForSession: (req: GetMessagesRequest) => Promise<GetMessagesResponse>;
    markRead: (req: MarkMessageReadRequest) => Promise<MarkMessageReadResponse>;
    getUnreadCount: (
      req: GetUnreadMessageCountRequest,
    ) => Promise<GetUnreadMessageCountResponse>;
  };

  // Analytics (admin/debugging)
  analytics: {
    getMetrics: (req: GetAnalyticsRequest) => Promise<GetAnalyticsResponse>;
    getFailedRequests: (
      req: GetFailedRequestsRequest,
    ) => Promise<GetFailedRequestsResponse>;
  };
}

// ============================================
// REQUEST/RESPONSE VALIDATION SCHEMAS
// ============================================

export const createCheckinRequestSchema = checkinFormSchema;
export const messageRequestSchema = messageRequestFormSchema;
export const sendMessageSchema = sendMessageFormSchema;
export const respondToRequestSchema = respondToRequestFormSchema;

export const searchPlacesRequestSchema = z.object({
  query: z.string().min(1).max(100),
  coordinates: coordinatesSchema,
  maxResults: z.number().int().min(1).max(50).optional(),
});

export const getNearbyPlacesRequestSchema = z.object({
  coordinates: coordinatesSchema,
  radius: z.number().int().min(100).max(50000).optional(), // meters
  types: z.array(z.string()).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
});

export const getCheckinsRequestSchema = z.object({
  placeId: placeIdSchema,
  includeInactive: z.boolean().optional(),
});

export const getMessageRequestsSchema = z.object({
  userId: userIdSchema,
  placeId: placeIdSchema.optional(),
  status: z
    .enum([
      MESSAGE_REQUEST_STATUS.PENDING,
      MESSAGE_REQUEST_STATUS.ACCEPTED,
      MESSAGE_REQUEST_STATUS.REJECTED,
      MESSAGE_REQUEST_STATUS.CANCELED,
      MESSAGE_REQUEST_STATUS.EXPIRED,
    ] as const)
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// ============================================
// UTILITY TYPES
// ============================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiEndpoint = {
  method: HttpMethod;
  path: string;
  authenticated: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
};

export type ApiErrorContext = {
  endpoint: string;
  method: HttpMethod;
  userId?: UserId;
  requestId?: string;
  userAgent?: string;
  ip?: string;
};

// ============================================
// EXPORTS FOR CLEAN IMPORTS
// ============================================

export type {
  // Re-export commonly used types
  UserId,
  PlaceId,
  CheckinId,
  SessionId,
  RequestId,
  MessageId,
  CheckinStatus,
  MessageRequestStatus,
  MessageSessionStatus,
  User,
  Place,
  Checkin,
  MessageRequest,
  MessageSession,
  Message,
};

export {
  // Constants
  CHECKIN_STATUS,
  MESSAGE_REQUEST_STATUS,
  MESSAGE_SESSION_STATUS,

  // Validation schemas
  checkinFormSchema,
  messageRequestFormSchema,
  sendMessageFormSchema,
  respondToRequestFormSchema,
};
