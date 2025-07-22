// app/api/nearby/route.ts
import { NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/api/googlePlaces";

export async function POST(req: Request) {
  const body = await req.json();
  const { latitude, longitude } = body;

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  try {
    const places = await getNearbyPlaces({ latitude, longitude });
    return NextResponse.json(places);
  } catch (err) {
    console.error("Nearby API failed", err);
    return NextResponse.json(
      { error: "Failed to fetch nearby places" },
      { status: 500 },
    );
  }
}
