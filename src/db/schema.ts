// src/db/schema.ts
import {
  pgTable,
  varchar,
  integer,
  timestamp,
  serial,
  doublePrecision,
  index,
  primaryKey, // Make sure primaryKey is imported if needed elsewhere
  pgEnum, // Import pgEnum for status
} from "drizzle-orm/pg-core";

// Define an Enum for status (optional but recommended)
export const checkinStatusEnum = pgEnum("checkin_status", [
  "available",
  "busy",
]);

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  kinde_id: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export const checkinsTable = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    userId: varchar("user_id", { length: 255 }) // Kinde ID
      .notNull()
      .references(() => usersTable.kinde_id, { onDelete: "cascade" }),
    placeId: varchar("place_id", { length: 255 }).notNull(), // Google Place ID
    placeName: varchar("place_name", { length: 255 }).notNull(),
    placeAddress: varchar("place_address", { length: 511 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    // --- New Fields ---
    status: checkinStatusEnum("status").notNull().default("available"), // 'available' or 'busy'
    topic: varchar("topic", { length: 120 }), // Optional conversation topic
    // --- End New Fields ---
  },
  (table) => ({
    // Indexes (keep existing, maybe add one for topic/status if queried often)
    userIdx: index("checkins_user_idx").on(table.userId),
    placeIdx: index("checkins_place_idx").on(table.placeId),
    statusIdx: index("checkins_status_idx").on(table.status), // Optional index
    createdAtIndex: index("checkins_created_at_idx").on(table.createdAt), // Index for time filtering
  })
);

export type InsertCheckin = typeof checkinsTable.$inferInsert;
export type SelectCheckin = typeof checkinsTable.$inferSelect;

export const placesTable = pgTable("places", {
  id: varchar("id", { length: 255 }).primaryKey(), // Google Place ID
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 511 }).notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type InsertPlace = typeof placesTable.$inferInsert;
export type SelectPlace = typeof placesTable.$inferSelect;
