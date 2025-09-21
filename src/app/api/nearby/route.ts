// app/api/nearby/route.ts
import { NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/api/googlePlaces";
import { coordinateSchema } from "@/lib/validators/common";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Validate coordinates
    const { latitude, longitude } = coordinateSchema.parse(body);

    const places = await getNearbyPlaces({ latitude, longitude });
    return NextResponse.json(places);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch nearby places" },
      { status: 500 },
    );
  }
}
