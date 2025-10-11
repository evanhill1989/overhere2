// app/api/nearby/route.ts - JUST ADD TIMING LOGS
import { NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/api/googlePlaces";
import { coordinateSchema } from "@/lib/validators/common";
import { z } from "zod";

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 API route started");

  try {
    const body = await req.json();
    const { latitude, longitude } = coordinateSchema.parse(body);

    const places = await getNearbyPlaces({ latitude, longitude });
    console.log("🏪 Places found:", places.length);

    // ✅ DEBUG: Log the structure of places being returned
    console.log(
      "🔍 First place structure:",
      JSON.stringify(places[0], null, 2),
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ API route completed in ${totalTime}ms`);

    return NextResponse.json(places);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ API route failed in ${totalTime}ms`);
    console.error("❌ Full error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch nearby places",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
