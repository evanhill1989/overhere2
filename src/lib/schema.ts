// src/lib/schema.ts
import { eq, sql } from "drizzle-orm";
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
  integer,
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
// OWNER DASHBOARD ENUMS
// ============================================
export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "verified",
  "rejected",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
  "phone",
  "mail",
  "manual",
]);

export const ownerRoleEnum = pgEnum("owner_role", ["owner", "manager"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
]);

export const promotionTypeEnum = pgEnum("promotion_type", [
  "featured_message",
  "priority_sort",
  "highlight_badge",
]);

export const promotionStatusEnum = pgEnum("promotion_status", [
  "scheduled",
  "active",
  "expired",
  "canceled",
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

// ============================================
// OWNER DASHBOARD TABLES
// ============================================

export const placeClaimsTable = pgTable(
  "place_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: varchar("place_id", { length: 255 })
      .notNull()
      .references(() => placesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    status: claimStatusEnum("status").notNull().default("pending"),
    verificationMethod: verificationMethodEnum("verification_method").notNull(),
    role: ownerRoleEnum("role").notNull().default("owner"),
    phoneNumber: varchar("phone_number", { length: 20 }),
    businessEmail: varchar("business_email", { length: 255 }),
    businessDescription: text("business_description"),
    yearsAtLocation: varchar("years_at_location", { length: 20 }),
    verificationCode: varchar("verification_code", { length: 10 }),
    verificationCodeExpiresAt: timestamp("verification_code_expires_at", {
      withTimezone: true,
    }),
    verificationCodeAttempts: integer("verification_code_attempts")
      .notNull()
      .default(0),
    rejectionReason: text("rejection_reason"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    fraudScore: integer("fraud_score").notNull().default(0),
    adminReviewNotes: text("admin_review_notes"),
    checkinIdAtClaim: uuid("checkin_id_at_claim").references(
      () => checkinsTable.id,
      { onDelete: "set null" },
    ),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    index("place_claims_place_idx").on(table.placeId),
    index("place_claims_user_idx").on(table.userId),
    index("place_claims_status_idx").on(table.status),
    index("place_claims_submitted_at_idx").on(table.submittedAt),
    index("place_claims_fraud_score_idx").on(table.fraudScore),
    index("place_claims_phone_idx").on(table.phoneNumber),
    uniqueIndex("place_claims_unique_pending")
      .on(table.placeId, table.userId)
      .where(sql`status = 'pending'`),
  ],
);

export const verifiedOwnersTable = pgTable(
  "verified_owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: varchar("place_id", { length: 255 })
      .notNull()
      .references(() => placesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: ownerRoleEnum("role").notNull().default("owner"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("trialing"),
    subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("verified_owners_place_idx").on(table.placeId),
    index("verified_owners_user_idx").on(table.userId),
    index("verified_owners_subscription_status_idx").on(
      table.subscriptionStatus,
    ),
    index("verified_owners_stripe_customer_idx").on(table.stripeCustomerId),
    unique().on(table.placeId, table.userId),
  ],
);

export const promotionsTable = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: varchar("place_id", { length: 255 })
      .notNull()
      .references(() => placesTable.id, { onDelete: "cascade" }),
    type: promotionTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }),
    message: text("message"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: promotionStatusEnum("status").notNull().default("scheduled"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("promotions_place_idx").on(table.placeId),
    index("promotions_status_idx").on(table.status),
    index("promotions_start_at_idx").on(table.startAt),
    index("promotions_end_at_idx").on(table.endAt),
    index("promotions_created_by_idx").on(table.createdBy),
  ],
);

export const placeOwnerSettingsTable = pgTable("place_owner_settings", {
  placeId: varchar("place_id", { length: 255 })
    .primaryKey()
    .references(() => placesTable.id, { onDelete: "cascade" }),
  // Custom content
  descriptionOverride: text("description_override"),
  announcementText: text("announcement_text"),
  announcementExpiresAt: timestamp("announcement_expires_at", {
    withTimezone: true,
  }),
  // Contact info (never publicly displayed, for admin/support only)
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  // Metadata
  lastUpdatedBy: uuid("last_updated_by").references(() => usersTable.id),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  publicWebsite: varchar("public_website", { length: 255 }),
  publicPhone: varchar("public_phone", { length: 20 }),
  publicEmail: varchar("public_email", { length: 255 }),
});

export const verificationAttemptsTable = pgTable(
  "verification_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => placeClaimsTable.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 20 }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("verification_attempts_claim_idx").on(table.claimId),
    index("verification_attempts_phone_idx").on(table.phoneNumber),
  ],
);

// Claim Audit Log
export const claimAuditLogTable = pgTable(
  "claim_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => placeClaimsTable.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(),
    actorId: uuid("actor_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("claim_audit_log_claim_idx").on(table.claimId),
    index("claim_audit_log_action_idx").on(table.action),
    index("claim_audit_log_created_at_idx").on(table.createdAt),
  ],
);

// Rate Limiting for Claims by IP
export const claimRateLimitTable = pgTable(
  "claim_rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    claimCount: integer("claim_count").notNull().default(1),
    windowStart: timestamp("window_start", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastClaimAt: timestamp("last_claim_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("claim_rate_limits_ip_idx").on(table.ipAddress),
    index("claim_rate_limits_window_idx").on(table.windowStart),
  ],
);
