// utils/supabase/browserClient.ts
import { createBrowserClient } from "@supabase/ssr";
import type {
  SupabaseClient,
  RealtimeChannelOptions,
} from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

// Track active channels globally with proper typing
const activeChannels = new Map<string, RealtimeChannel>();

export function createClient(): SupabaseClient {
  if (!supabase) {
    supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: "pkce" } },
    );

    // ✅ Monkey-patch channel creation for logging
    const originalChannel = supabase.channel.bind(supabase);
    supabase.channel = (
      name: string,
      opts?: RealtimeChannelOptions,
    ): RealtimeChannel => {
      const channel = originalChannel(name, opts);
      activeChannels.set(name, channel);

      console.log(
        `[Realtime] 🔗 Channel created: ${name} (${activeChannels.size} total)`,
      );

      // Watch for closure/unsubscribe
      const originalUnsubscribe = channel.unsubscribe.bind(channel);
      channel.unsubscribe = async (
        timeout?: number,
      ): Promise<"ok" | "timed out" | "error"> => {
        activeChannels.delete(name);
        console.log(
          `[Realtime] ❌ Channel unsubscribed: ${name} (${activeChannels.size} remaining)`,
        );
        return originalUnsubscribe(timeout);
      };

      return channel;
    };
  }

  return supabase;
}

// ✅ Optional diagnostic utility
export function logActiveChannels(): void {
  console.table(
    Array.from(activeChannels.keys()).map((name) => ({
      name,
      state: activeChannels.get(name)?.state || "unknown",
    })),
  );
  console.log(`[Realtime] Currently active: ${activeChannels.size} channel(s)`);
}
