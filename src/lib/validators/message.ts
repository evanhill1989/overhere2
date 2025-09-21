// src/lib/validators/message.ts
import { z } from "zod";
import { uuidSchema, messageContentSchema } from "./common";

export const messageSchema = z.object({
  sessionId: uuidSchema,
  senderCheckinId: z.number().int().positive("Invalid checkin ID"),
  content: messageContentSchema,
});

export const messageRequestSchema = z.object({
  initiatorId: uuidSchema,
  initiateeId: uuidSchema,
  placeId: z.string().min(1, "Place ID is required"),
});

export const respondToRequestSchema = z.object({
  requestId: uuidSchema,
  response: z.enum(["accepted", "rejected", "canceled"]),
});
