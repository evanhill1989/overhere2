// db/schema.ts

import {
  pgTable,
  varchar,
  integer,
  timestamp,
  serial,
  doublePrecision,
  index,
  pgEnum,
  uuid,
  text,
  boolean,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const checkinStatusEnum = pgEnum("checkin_status", [
  "available",
  "busy",
]);
export const messageRequestStatusEnum = pgEnum("message_request_status", [
  "pending",
  "accepted",
  "rejected",
  "canceled",
]);

// Users
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Places
export const placesTable = pgTable("places", {
  id: varchar("id", { length: 255 }).primaryKey(),
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
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    placeId: varchar("place_id", { length: 255 }).notNull(),
    placeName: varchar("place_name", { length: 255 }).notNull(),
    placeAddress: varchar("place_address", { length: 511 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    status: checkinStatusEnum("status").notNull().default("available"),
    topic: varchar("topic", { length: 120 }),
    isActive: boolean("is_active").notNull().default(false),
    checkedOutAt: timestamp("checked_out_at"),
  },
  (table) => ({
    // Indexes for performance
    userIdx: index("checkins_user_idx").on(table.userId),
    placeIdx: index("checkins_place_idx").on(table.placeId),
    statusIdx: index("checkins_status_idx").on(table.status),
    createdAtIndex: index("checkins_created_at_idx").on(table.createdAt),

    // 🚦 UNIQUE: ensure one active check‑in per user
    uniqueByUser: unique().on(table.userId),
  }),
);

// Message Requests
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

    placeId: varchar("place_id", { length: 255 }).notNull(),

    status: messageRequestStatusEnum("status").default("pending").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniquePairPerPlace: unique().on(
      table.initiatorId,
      table.initiateeId,
      table.placeId,
    ),
  }),
);

// Message Sessions
export const messageSessionsTable = pgTable(
  "message_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    placeId: varchar("place_id", { length: 255 }).notNull(),

    initiatorId: uuid("initiator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    initiateeId: uuid("initiatee_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    status: messageRequestStatusEnum("status").notNull().default("pending"),
  },
  (table) => ({
    initiatorIdx: index("message_session_initiator_idx").on(table.initiatorId),
    initiateeIdx: index("message_session_initiatee_idx").on(table.initiateeId),
    placeIdx: index("message_session_place_idx").on(table.placeId),
    statusIdx: index("message_session_status_idx").on(table.status),
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
    senderCheckinId: integer("sender_checkin_id")
      .notNull()
      .references(() => checkinsTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionIdx: index("message_session_idx").on(table.sessionId),
    senderIdx: index("message_sender_idx").on(table.senderCheckinId),
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  }),
);

// Failed Message Attempts
export const failedMessageRequests = pgTable("failed_message_requests", {
  id: serial("id").primaryKey(),
  initiatorId: uuid("initiator_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  initiateeId: uuid("initiatee_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  placeId: varchar("place_id", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
