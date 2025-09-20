// src/app/rls-test/page.tsx - FIXED
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export default function RLSTestPage() {
  const [results, setResults] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [testPlace, setTestPlace] = useState<string>(""); // ✅ Start empty
  const supabase = createClient();

  // ✅ Generate test place ID on client mount only
  useEffect(() => {
    setTestPlace("test-place-" + Date.now());
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  const testReadOwnCheckins = async () => {
    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user?.id);

    setResults((prev) => [
      ...prev,
      {
        test: "Read own checkins",
        success: !error,
        data: data?.length || 0,
        error: error?.message,
      },
    ]);
  };

  const testCreateCheckin = async () => {
    if (!user || !testPlace) return; // ✅ Check testPlace exists

    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: user.id,
        place_id: testPlace,
        place_name: "RLS Test Cafe",
        place_address: "123 Test Street",
        is_active: true,
        checkin_status: "available",
      })
      .select()
      .single();

    setResults((prev) => [
      ...prev,
      {
        test: "Create own checkin",
        success: !error,
        data: data?.id || "none",
        error: error?.message,
      },
    ]);
  };

  const testReadCheckinsAtSamePlace = async () => {
    if (!testPlace) return; // ✅ Check testPlace exists

    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .eq("place_id", testPlace);

    setResults((prev) => [
      ...prev,
      {
        test: "Read checkins at same place",
        success: !error,
        data: `${data?.length || 0} checkins at test place`,
        error: error?.message,
      },
    ]);
  };

  const testReadCheckinsAtDifferentPlace = async () => {
    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .eq("place_id", "different-place-123")
      .eq("is_active", true);

    setResults((prev) => [
      ...prev,
      {
        test: "Read checkins at different place (should be 0)",
        success: !error && data?.length === 0,
        data: `${data?.length || 0} checkins (should be 0)`,
        error: error?.message,
      },
    ]);
  };

  const testGetActivePlaces = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc("get_user_active_places", {
      user_id_param: user.id,
    });

    setResults((prev) => [
      ...prev,
      {
        test: "Get user active places (function)",
        success: !error,
        data: `${data?.length || 0} active places`,
        error: error?.message,
      },
    ]);
  };

  const testIsUserAtPlace = async () => {
    if (!user || !testPlace) return; // ✅ Check both exist

    const { data, error } = await supabase.rpc("is_user_checked_in_at_place", {
      user_id_param: user.id,
      place_id_param: testPlace,
    });

    setResults((prev) => [
      ...prev,
      {
        test: "Check if user at test place",
        success: !error,
        data: `User at place: ${data}`,
        error: error?.message,
      },
    ]);
  };

  const clearResults = () => setResults([]);

  // ✅ Show loading state until testPlace is ready
  if (!testPlace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Initializing test...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">RLS Policy Tests (Location-Based)</h1>
      <p className="text-muted-foreground text-sm">
        User: {user?.email || "Not logged in"}
      </p>
      <p className="text-muted-foreground text-xs">
        Test Place ID: {testPlace}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={testReadOwnCheckins} size="sm">
          1. Read Own Checkins
        </Button>
        <Button onClick={testCreateCheckin} size="sm">
          2. Create Test Checkin
        </Button>
        <Button onClick={testReadCheckinsAtSamePlace} size="sm">
          3. Read Same Place
        </Button>
        <Button onClick={testReadCheckinsAtDifferentPlace} size="sm">
          4. Read Different Place
        </Button>
        <Button onClick={testGetActivePlaces} size="sm">
          5. Get Active Places
        </Button>
        <Button onClick={testIsUserAtPlace} size="sm">
          6. Check If At Place
        </Button>
        <Button onClick={clearResults} variant="outline" size="sm">
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Test Results:</h2>
        {results.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Run tests to see results...
          </p>
        )}
        {results.map((result, i) => (
          <div
            key={i}
            className={`rounded p-3 ${
              result.success
                ? "bg-green-100 dark:bg-green-900/20"
                : "bg-red-100 dark:bg-red-900/20"
            }`}
          >
            <div className="font-bold">{result.test}</div>
            <div className="text-sm">{result.error || `✅ ${result.data}`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
