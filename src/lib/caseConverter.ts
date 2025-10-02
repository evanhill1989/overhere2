// src/lib/utils/caseConverter.ts
import type {
  Checkin,
  MessageRequest,
  MessageSession,
  Message,
  User,
  Place,
} from "@/lib/types/database";
import {
  checkinSchema,
  messageRequestSchema,
  messageSessionSchema,
  messageSchema,
  userSchema,
  placeSchema,
} from "@/lib/types/database";

// ============================================
// SNAKE_CASE DATABASE TYPES
// ============================================

type DatabaseCheckin = {
  id: number;
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

type DatabaseMessageRequest = {
  id: string;
  initiator_id: string;
  initiatee_id: string;
  place_id: string;
  status: "pending" | "accepted" | "rejected" | "canceled" | "expired";
  created_at: string;
  responded_at: string | null;
};

type DatabaseMessageSession = {
  id: string;
  place_id: string;
  initiator_id: string;
  initiatee_id: string;
  source_request_id: string | null;
  created_at: string;
  status: "active" | "expired";
  expires_at: string | null;
  closed_at: string | null;
};

type DatabaseMessage = {
  id: number;
  session_id: string;
  sender_checkin_id: number;
  content: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

type DatabaseUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

type DatabasePlace = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  last_fetched_at: string;
  is_verified: boolean;
  primary_type: string | null;
};

// ============================================
// TYPE-SAFE CONVERTERS WITH VALIDATION
// ============================================

/**
 * Convert and validate database checkin to canonical Checkin type
 */
export function mapCheckinToCamel(raw: DatabaseCheckin): Checkin {
  const converted = {
    id: raw.id,
    userId: raw.user_id,
    placeId: raw.place_id,
    placeName: raw.place_name,
    placeAddress: raw.place_address,
    latitude: raw.latitude,
    longitude: raw.longitude,
    checkinStatus: raw.checkin_status,
    topic: raw.topic,
    isActive: raw.is_active,
    createdAt: raw.created_at,
    checkedOutAt: raw.checked_out_at,
  };

  return checkinSchema.parse(converted);
}

/**
 * Convert and validate database message request to canonical MessageRequest type
 */
export function mapMessageRequestToCamel(
  raw: DatabaseMessageRequest,
): MessageRequest {
  const converted = {
    id: raw.id,
    initiatorId: raw.initiator_id,
    initiateeId: raw.initiatee_id,
    placeId: raw.place_id,
    status: raw.status,
    createdAt: raw.created_at,
    respondedAt: raw.responded_at,
  };

  return messageRequestSchema.parse(converted);
}

/**
 * Convert and validate database message session to canonical MessageSession type
 */
export function mapMessageSessionToCamel(
  raw: DatabaseMessageSession,
): MessageSession {
  const converted = {
    id: raw.id,
    placeId: raw.place_id,
    initiatorId: raw.initiator_id,
    initiateeId: raw.initiatee_id,
    sourceRequestId: raw.source_request_id,
    createdAt: raw.created_at,
    status: raw.status,
    expiresAt: raw.expires_at,
    closedAt: raw.closed_at,
  };

  return messageSessionSchema.parse(converted);
}

/**
 * Convert and validate database message to canonical Message type
 */
export function mapMessageToCamel(raw: DatabaseMessage): Message {
  const converted = {
    id: raw.id,
    sessionId: raw.session_id,
    senderCheckinId: raw.sender_checkin_id,
    content: raw.content,
    createdAt: raw.created_at,
    deliveredAt: raw.delivered_at,
    readAt: raw.read_at,
  };

  return messageSchema.parse(converted);
}

/**
 * Convert and validate database user to canonical User type
 */
export function mapUserToCamel(raw: DatabaseUser): User {
  const converted = {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    createdAt: raw.created_at,
  };

  return userSchema.parse(converted);
}

/**
 * Convert and validate database place to canonical Place type
 */
export function mapPlaceToCamel(raw: DatabasePlace): Place {
  const converted = {
    id: raw.id,
    name: raw.name,
    address: raw.address,
    latitude: raw.latitude,
    longitude: raw.longitude,
    lastFetchedAt: raw.last_fetched_at,
    isVerified: raw.is_verified,
    primaryType: raw.primary_type,
  };

  return placeSchema.parse(converted);
}

// ============================================
// ARRAY CONVERTERS
// ============================================

export function mapCheckinsToCamel(raw: DatabaseCheckin[]): Checkin[] {
  return raw.map(mapCheckinToCamel);
}

export function mapMessageRequestsToCamel(
  raw: DatabaseMessageRequest[],
): MessageRequest[] {
  return raw.map(mapMessageRequestToCamel);
}

export function mapMessageSessionsToCamel(
  raw: DatabaseMessageSession[],
): MessageSession[] {
  return raw.map(mapMessageSessionToCamel);
}

export function mapMessagesToCamel(raw: DatabaseMessage[]): Message[] {
  return raw.map(mapMessageToCamel);
}

// ============================================
// REVERSE: CAMEL TO SNAKE (for mutations)
// ============================================

export function mapCheckinToSnake(
  camel: Partial<Checkin>,
): Partial<DatabaseCheckin> {
  const snake: Partial<DatabaseCheckin> = {};

  if (camel.id !== undefined) snake.id = camel.id;
  if (camel.userId !== undefined) snake.user_id = camel.userId;
  if (camel.placeId !== undefined) snake.place_id = camel.placeId;
  if (camel.placeName !== undefined) snake.place_name = camel.placeName;
  if (camel.placeAddress !== undefined)
    snake.place_address = camel.placeAddress;
  if (camel.latitude !== undefined) snake.latitude = camel.latitude;
  if (camel.longitude !== undefined) snake.longitude = camel.longitude;
  if (camel.checkinStatus !== undefined)
    snake.checkin_status = camel.checkinStatus;
  if (camel.topic !== undefined) snake.topic = camel.topic;
  if (camel.isActive !== undefined) snake.is_active = camel.isActive;
  if (camel.createdAt !== undefined)
    snake.created_at = camel.createdAt.toString();
  if (camel.checkedOutAt !== undefined)
    snake.checked_out_at = camel.checkedOutAt?.toString() ?? null;

  return snake;
}

export function mapMessageRequestToSnake(
  camel: Partial<MessageRequest>,
): Partial<DatabaseMessageRequest> {
  const snake: Partial<DatabaseMessageRequest> = {};

  if (camel.id !== undefined) snake.id = camel.id;
  if (camel.initiatorId !== undefined) snake.initiator_id = camel.initiatorId;
  if (camel.initiateeId !== undefined) snake.initiatee_id = camel.initiateeId;
  if (camel.placeId !== undefined) snake.place_id = camel.placeId;
  if (camel.status !== undefined) snake.status = camel.status;
  if (camel.createdAt !== undefined)
    snake.created_at = camel.createdAt.toString();
  if (camel.respondedAt !== undefined)
    snake.responded_at = camel.respondedAt?.toString() ?? null;

  return snake;
}

// ============================================
// GENERIC HELPERS (use sparingly, prefer typed converters)
// ============================================

/**
 * Generic snake_case to camelCase converter
 * ⚠️ Use typed converters above when possible for validation
 */
export function genericToCamel<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;

  if (Array.isArray(obj)) {
    return obj.map((item) => genericToCamel<unknown>(item)) as T;
  }

  if (obj instanceof Date) {
    return obj as T;
  }

  if (typeof obj !== "object") {
    return obj as T;
  }

  const converted: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      const value = (obj as Record<string, unknown>)[key];
      converted[camelKey] = genericToCamel<unknown>(value);
    }
  }

  return converted as T;
}

/**
 * Generic camelCase to snake_case converter
 * ⚠️ Use typed converters above when possible
 */
export function genericToSnake<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;

  if (Array.isArray(obj)) {
    return obj.map((item) => genericToSnake<unknown>(item)) as T;
  }

  if (obj instanceof Date) {
    return obj as T;
  }

  if (typeof obj !== "object") {
    return obj as T;
  }

  const converted: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      const value = (obj as Record<string, unknown>)[key];
      converted[snakeKey] = genericToSnake<unknown>(value);
    }
  }

  return converted as T;
}
