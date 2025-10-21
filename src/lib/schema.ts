// src/lib/schema.ts
import { eq } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  serial,
  doublePrecision,
  index,
  pgEnum,
  uuid,
  text,
  boolean,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================
// ENUMS (Separated for clarity)
// ============================================
export const checkinStatusEnum = pgEnum("checkin_status", [
  "available",
  "busy",
]);

export const messageRequestStatusEnum = pgEnum("message_request_status", [
  "pending",
  "accepted",
  "rejected",
  "canceled",
  "expired",
]);

export const messageSessionStatusEnum = pgEnum("message_session_status", [
  "active",
  "expired",
]);

// ============================================
// TABLES (Standardized timestamps)
// ============================================

// Users
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(), // ✅ Added timezone
});

// Places
export const placesTable = pgTable("places", {
  id: varchar("id", { length: 255 }).primaryKey(), // Google Place ID
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 511 }).notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  isVerified: boolean("is_verified").notNull().default(false),
  primaryType: varchar("primary_type", { length: 255 }),
});

// Check-ins
export const checkinsTable = pgTable(
  "checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(), // ✅ Added timezone
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    placeId: varchar("place_id", { length: 255 })
      .notNull()
      .references(() => placesTable.id), // ✅ Added FK constraint for data integrity
    placeName: varchar("place_name", { length: 255 }).notNull(),
    placeAddress: varchar("place_address", { length: 511 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    checkinStatus: checkinStatusEnum("checkin_status")
      .notNull()
      .default("available"),
    topic: varchar("topic", { length: 120 }),
    isActive: boolean("is_active").notNull().default(true), // ✅ Changed default to true
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }), // ✅ Added timezone
  },
  (table) => ({
    userIdx: index("checkins_user_idx").on(table.userId),
    placeIdx: index("checkins_place_idx").on(table.placeId),
    statusIdx: index("checkins_status_idx").on(table.checkinStatus),
    createdAtIndex: index("checkins_created_at_idx").on(table.createdAt),
    uniqueActiveCheckin: uniqueIndex("checkins_user_active_unique")
      .on(table.userId)
      .where(eq(table.isActive, true)),
  }),
);

// Message Session Requests
export const messageSessionRequestsTable = pgTable(
  "message_session_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    initiatorId: uuid("initiator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    initiateeId: uuid("initiatee_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    placeId: varchar("place_id", { length: 255 })
      .notNull()
      .references(() => placesTable.id), // ✅ Added FK constraint
    status: messageRequestStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(), // ✅ Added timezone
    // ✅ Added response timestamp for analytics
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => ({
    uniquePairPerPlace: unique().on(
      table.initiatorId,
      table.initiateeId,
      table.placeId,
    ),
    // ✅ Added indexes for performance
    initiatorIdx: index("request_initiator_idx").on(table.initiatorId),
    initiateeIdx: index("request_initiatee_idx").on(table.initiateeId),
    placeIdx: index("request_place_idx").on(table.placeId),
    statusIdx: index("request_status_idx").on(table.status),
    createdAtIdx: index("request_created_at_idx").on(table.createdAt),
  }),
);

// Message Sessions
export const messageSessionsTable = pgTable(
  "message_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: varchar("place_id", { length: 255 })
      .notNull()
      .references(() => placesTable.id), // ✅ Added FK constraint
    initiatorId: uuid("initiator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    initiateeId: uuid("initiatee_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // ✅ Reference the request that created this session
    sourceRequestId: uuid("source_request_id").references(
      () => messageSessionRequestsTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: messageSessionStatusEnum("status").notNull().default("active"), // ✅ New enum
    // ✅ Track when session expires/closes
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => ({
    initiatorIdx: index("message_session_initiator_idx").on(table.initiatorId),
    initiateeIdx: index("message_session_initiatee_idx").on(table.initiateeId),
    placeIdx: index("message_session_place_idx").on(table.placeId),
    statusIdx: index("message_session_status_idx").on(table.status),
    sourceRequestIdx: index("message_session_source_request_idx").on(
      table.sourceRequestId,
    ),
  }),
);

// Messages
export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => messageSessionsTable.id, { onDelete: "cascade" }),
    senderCheckinId: uuid("sender_checkin_id")
      .notNull()
      .references(() => checkinsTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // ✅ Track message delivery/read status
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => ({
    sessionIdx: index("message_session_idx").on(table.sessionId),
    senderIdx: index("message_sender_idx").on(table.senderCheckinId),
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  }),
);

// ✅ Enhanced failed message requests for better debugging
export const failedMessageRequestsTable = pgTable(
  "failed_message_requests",
  {
    id: serial("id").primaryKey(),
    initiatorId: uuid("initiator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    initiateeId: uuid("initiatee_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    placeId: varchar("place_id", { length: 255 }).references(
      () => placesTable.id,
    ), // ✅ Made nullable FK for edge cases
    reason: varchar("reason", { length: 255 }).notNull(),
    errorDetails: text("error_details"), // ✅ Full error info for debugging
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // ✅ Indexes for analytics queries
    initiatorIdx: index("failed_request_initiator_idx").on(table.initiatorId),
    reasonIdx: index("failed_request_reason_idx").on(table.reason),
    createdAtIdx: index("failed_request_created_at_idx").on(table.createdAt),
  }),
);
