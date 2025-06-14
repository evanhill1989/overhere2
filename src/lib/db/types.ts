// lib/db/types.ts drizzle generated types
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {
  checkinsTable,
  usersTable,
  messageRequestsTable,

  // Add other tables as needed
} from "@/lib/newSchema";

export type MessageRequestStatus = "pending" | "sent" | "failed";

export type SelectCheckin = InferSelectModel<typeof checkinsTable>;
export type InsertCheckin = InferInsertModel<typeof checkinsTable>;

export type SelectUser = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;

export type MessageRequest = typeof messageRequestsTable.$inferSelect;
export type NewMessageRequest = typeof messageRequestsTable.$inferInsert;
