import { NextResponse } from "next/server";

const SERVICE_PROVIDER = "google"; // or 'mapbox', 'other'
const Maps_API_KEY = process.env.Maps_API_KEY;

export async function POST(request: Request) {
  if (!Maps_API_KEY) {
    console.error("Mapping API Key/Token is missing");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  try {
    const { latitude, longitude } = await request.json();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 }
      );
    }

    let apiUrl = "";
    let places = [];

    if (SERVICE_PROVIDER === "google") {
      const radius = 500;
      apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude}%2C${longitude}&radius=${radius}&key=${Maps_API_KEY}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(
          "Google Places API request failed:",
          response.status,
          response.statusText
        );
        const errorBody = await response.text();
        console.error("Error Body:", errorBody);
        throw new Error(
          `Google Places API request failed: ${response.statusText}`
        );
      }
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error(
          "Google Places API Error:",
          data.status,
          data.error_message
        );
        throw new Error(
          `Google Places API Error: ${data.status} - ${
            data.error_message || "Unknown error"
          }`
        );
      }

      places = (data.results || []).map((place: any) => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
      }));
    } else {
      return NextResponse.json(
        { error: "Invalid service provider configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ places });
  } catch (error: any) {
    console.error("Error fetching nearby places:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch nearby places",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
