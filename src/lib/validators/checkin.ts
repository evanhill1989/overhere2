import { z } from "zod";

export const checkInSchema = z
  .object({
    placeId: z.string().min(1),
    placeName: z.string().min(1),
    placeAddress: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    topic: z.string().max(120).optional().nullable(),
    status: z.enum(["available", "busy"]),
  })
  .transform((data) => ({
    place_id: data.placeId,
    place_name: data.placeName,
    place_address: data.placeAddress,
    latitude: data.latitude,
    longitude: data.longitude,
    topic: data.topic,
    status: data.status,
  }));
