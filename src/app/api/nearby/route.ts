// app/api/nearby/route.ts - JUST ADD TIMING LOGS
import { NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/api/googlePlaces";
import { coordinateSchema } from "@/lib/validators/common";
import { z } from "zod";

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 API route started");

  try {
    console.time("⏱️ Parse request body");
    const body = await req.json();
    console.log("📝 Request body:", body);
    console.timeEnd("⏱️ Parse request body");

    console.time("⏱️ Validate coordinates");
    const { latitude, longitude } = coordinateSchema.parse(body);
    console.log("📍 Validated coordinates:", { latitude, longitude });
    console.timeEnd("⏱️ Validate coordinates");

    console.time("⏱️ getNearbyPlaces call");
    const places = await getNearbyPlaces({ latitude, longitude });
    console.log("🏪 Places found:", places.length);
    console.timeEnd("⏱️ getNearbyPlaces call");

    console.time("⏱️ Create JSON response");
    const response = NextResponse.json(places);
    console.timeEnd("⏱️ Create JSON response");

    const totalTime = Date.now() - startTime;
    console.log(`✅ API route completed in ${totalTime}ms`);

    return response;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ API route failed in ${totalTime}ms`);
    console.error("❌ Full error:", error);
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack",
    );

    if (error instanceof z.ZodError) {
      console.error("❌ Zod validation error:", error.errors);
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
