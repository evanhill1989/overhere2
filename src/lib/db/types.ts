// lib/db/types.ts drizzle generated types
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {
  checkinsTable,
  usersTable,
  messageSessionRequestsTable,
  messageSessionsTable,

  // Add other tables as needed
} from "@/lib/schema";

export type MessageRequestStatus = "pending" | "sent" | "failed";

export type SelectSession = InferSelectModel<typeof messageSessionsTable>;
export type InsertSession = InferInsertModel<typeof messageSessionsTable>;

export type SelectCheckin = InferSelectModel<typeof checkinsTable>;
export type InsertCheckin = InferInsertModel<typeof checkinsTable>;

export type SelectUser = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;

export type MessageRequest = typeof messageSessionRequestsTable.$inferSelect;
export type NewMessageRequest = typeof messageSessionRequestsTable.$inferInsert;
