// src/lib/validators/checkin.ts
import { z } from "zod";
import {
  placeIdSchema,
  placeNameSchema,
  addressSchema,
  coordinateSchema,
  topicSchema,
  sanitizeText,
} from "./common";

export const checkInSchema = z
  .object({
    placeId: placeIdSchema,
    placeName: placeNameSchema,
    placeAddress: addressSchema,
    latitude: coordinateSchema.shape.latitude,
    longitude: coordinateSchema.shape.longitude,
    topic: topicSchema,
    checkinStatus: z.enum(["available", "busy"]),
  })
  .transform((data) => ({
    place_id: data.placeId,
    place_name: sanitizeText(data.placeName),
    place_address: sanitizeText(data.placeAddress),
    latitude: data.latitude,
    longitude: data.longitude,
    topic: data.topic ? sanitizeText(data.topic) : null,
    checkin_status: data.checkinStatus,
  }));
