// lib/db/types.ts
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  checkinsTable,
  usersTable,
  placesTable,
  messageSessionsTable,
  messageSessionRequestsTable,
  messagesTable,
  failedMessageRequests,
} from "@/lib/schema";

// Enums
export type MessageRequestStatus =
  | "pending"
  | "sent"
  | "failed"
  | "rejected"
  | "accepted"
  | "canceled";

// User
export type SelectUser = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;

// Checkin
export type SelectCheckin = InferSelectModel<typeof checkinsTable>;
export type InsertCheckin = InferInsertModel<typeof checkinsTable>;

// Place
export type SelectPlace = InferSelectModel<typeof placesTable>;
export type InsertPlace = InferInsertModel<typeof placesTable>;

// Message Session
export type SelectMessageSession = InferSelectModel<
  typeof messageSessionsTable
>;
export type InsertMessageSession = InferInsertModel<
  typeof messageSessionsTable
>;

// Message Session Request
export type SelectMessageSessionRequest = InferSelectModel<
  typeof messageSessionRequestsTable
>;
export type InsertMessageSessionRequest = InferInsertModel<
  typeof messageSessionRequestsTable
>;

// Message
export type SelectMessage = InferSelectModel<typeof messagesTable>;
export type InsertMessage = InferInsertModel<typeof messagesTable>;

// Failed Message Request
export type SelectFailedMessageRequest = InferSelectModel<
  typeof failedMessageRequests
>;
export type InsertFailedMessageRequest = InferInsertModel<
  typeof failedMessageRequests
>;
