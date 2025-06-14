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
export const chatSessionStatusEnum = pgEnum("chat_session_status", [
  "pending",
  "active",
  "rejected",
  "closed",
]);

export const messageRequestStatusEnum = pgEnum("message_request_status", [
  "pending",
  "accepted",
  "rejected",
]);
// Tables
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
    userIdx: index("checkins_user_idx").on(table.userId),
    placeIdx: index("checkins_place_idx").on(table.placeId),
    statusIdx: index("checkins_status_idx").on(table.status),
    createdAtIndex: index("checkins_created_at_idx").on(table.createdAt),
  }),
);

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
    statusIdx: index("chat_session_status_idx").on(table.status),
  }),
);

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    chatSessionId: uuid("chat_session_id")
      .notNull()
      .references(() => chatSessionsTable.id, { onDelete: "cascade" }),
    senderCheckinId: integer("sender_checkin_id")
      .notNull()
      .references(() => checkinsTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    chatSessionIdx: index("message_chat_session_idx").on(table.chatSessionId),
    senderIdx: index("message_sender_idx").on(table.senderCheckinId),
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  }),
);

export const messageRequestsTable = pgTable(
  "message_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    senderId: uuid("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    checkinId: integer("checkin_id")
      .notNull()
      .references(() => checkinsTable.id, { onDelete: "cascade" }),

    message: text("message").notNull(),

    status: messageRequestStatusEnum("status").default("pending").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSenderReceiverCheckin: unique().on(
      table.senderId,
      table.receiverId,
      table.checkinId,
    ),
  }),
);
export const messageRequests = pgTable(
  "message_requests",
  {
    id: serial("id").primaryKey(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    placeId: varchar("place_id", { length: 255 }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    fulfilled: boolean("fulfilled").default(false),
    rejected: boolean("rejected").default(false),
    seen: boolean("seen").default(false),
  },
  (table) => {
    return {
      uniqueSenderRecipient: unique().on(
        table.senderId,
        table.recipientId,
        table.placeId,
      ),
    };
  },
);

export const failedMessageRequests = pgTable("failed_message_requests", {
  id: serial("id").primaryKey(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  placeId: varchar("place_id", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
// Type Exports
export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertCheckin = typeof checkinsTable.$inferInsert;
export type SelectCheckin = typeof checkinsTable.$inferSelect;
export type InsertPlace = typeof placesTable.$inferInsert;
export type SelectPlace = typeof placesTable.$inferSelect;
export type InsertChatSession = typeof chatSessionsTable.$inferInsert;
export type SelectChatSession = typeof chatSessionsTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
export type SelectMessage = typeof messagesTable.$inferSelect;
