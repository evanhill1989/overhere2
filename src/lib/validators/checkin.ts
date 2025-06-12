// lib/validators/checkin.ts
import { z } from "zod";

export const checkInSchema = z
  .object({
    placeId: z.string().min(1),
    placeName: z.string().min(1),
    placeAddress: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  })
  .transform((data) => ({
    place_id: data.placeId,
    place_name: data.placeName,
    place_address: data.placeAddress,
    latitude: data.latitude,
    longitude: data.longitude,
  }));
