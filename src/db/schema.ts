import {
  pgTable,
  varchar,
  integer,
  timestamp,
  serial,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  kinde_id: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

// --- New checkinsTable ---
export const checkinsTable = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),

    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => usersTable.kinde_id, { onDelete: "cascade" }),
    placeId: varchar("place_id", { length: 255 }).notNull(),
    placeName: varchar("place_name", { length: 255 }).notNull(),
    placeAddress: varchar("place_address", { length: 511 }).notNull(),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
  },
  (table) => {
    return {
      userIdx: index("checkins_user_idx").on(table.userId),
      placeIdx: index("checkins_place_idx").on(table.placeId),
    };
  }
);

export type InsertCheckin = typeof checkinsTable.$inferInsert;
export type SelectCheckin = typeof checkinsTable.$inferSelect;

export const placesTable = pgTable("places", {
  // Using Google Place ID as the primary key
  id: varchar("id", { length: 255 }).primaryKey(), // Google Place ID
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 511 }).notNull(), // Use formatted_address from Google
  latitude: doublePrecision("latitude"), // Can be null if Google doesn't provide
  longitude: doublePrecision("longitude"), // Can be null if Google doesn't provide
  // Record when we last fetched this from Google to check for staleness
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type InsertPlace = typeof placesTable.$inferInsert;
export type SelectPlace = typeof placesTable.$inferSelect; // Use this type for fetched/cached data
