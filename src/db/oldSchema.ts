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
  boolean, // Import pgEnum for status
} from "drizzle-orm/pg-core";

// Define an Enum for status (optional but recommended)
export const checkinStatusEnum = pgEnum("checkin_status", [
  "available",
  "busy",
]);
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey(), // Matches Supabase auth.users.id
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
    isActive: boolean("is_active").notNull().default(true),
    checkedOutAt: timestamp("checked_out_at"),
  },
  (table) => ({
    userIdx: index("checkins_user_idx").on(table.userId),
    placeIdx: index("checkins_place_idx").on(table.placeId),
    statusIdx: index("checkins_status_idx").on(table.status),
    createdAtIndex: index("checkins_created_at_idx").on(table.createdAt),
  }),
);

export const chatSessionStatusEnum = pgEnum("chat_session_status", [
  "pending",
  "active",
  "rejected",
  "closed",
]);

export const chatSessionsTable = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: varchar("place_id", { length: 255 }).notNull(),
    initiatorCheckinId: integer("initiator_checkin_id")
      .notNull()
      .references(() => checkinsTable.id, { onDelete: "cascade" }),
    receiverCheckinId: integer("receiver_checkin_id")
      .notNull()
      .references(() => checkinsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    status: chatSessionStatusEnum("status").notNull().default("pending"),
  },
  (table) => ({
    initiatorIdx: index("chat_session_initiator_idx").on(
      table.initiatorCheckinId,
    ),
    receiverIdx: index("chat_session_receiver_idx").on(table.receiverCheckinId),
    placeIdx: index("chat_session_place_idx").on(table.placeId),
    // Optional: Index the status column if you query by it often
    statusIdx: index("chat_session_status_idx").on(table.status),
  }),
);

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(), // Auto-incrementing ID for messages
    chatSessionId: uuid("chat_session_id")
      .notNull()
      .references(() => chatSessionsTable.id, { onDelete: "cascade" }),
    senderCheckinId: integer("sender_checkin_id")
      .notNull()
      .references(() => checkinsTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(), // The actual message text
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Crucial index for fetching messages for a specific chat and for realtime filters
    chatSessionIdx: index("message_chat_session_idx").on(table.chatSessionId),
    // Index for potential ordering or fetching messages by sender
    senderIdx: index("message_sender_idx").on(table.senderCheckinId),
    // Index for ordering messages chronologically
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  }),
);

// --- Type Exports ---
export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertCheckin = typeof checkinsTable.$inferInsert;
export type SelectCheckin = typeof checkinsTable.$inferSelect;
export type InsertPlace = typeof placesTable.$inferInsert;
export type SelectPlace = typeof placesTable.$inferSelect;
// New Types
export type InsertChatSession = typeof chatSessionsTable.$inferInsert;
export type SelectChatSession = typeof chatSessionsTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
export type SelectMessage = typeof messagesTable.$inferSelect; // Use this for message objects
