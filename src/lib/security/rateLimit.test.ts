import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, cleanupExpiredEntries } from "./rateLimit";

beforeEach(() => {
  vi.useRealTimers();
  // Reset all stores by calling rateLimit with unique keys each test
});

describe("rateLimit", () => {
  it("allows first request with correct remaining count", () => {
    const result = rateLimit("test-first-request", {
      limit: 5,
      windowMs: 60000,
    });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests up to the limit", () => {
    const id = "test-up-to-limit";
    const config = { limit: 3, windowMs: 60000 };

    const r1 = rateLimit(id, config);
    const r2 = rateLimit(id, config);
    const r3 = rateLimit(id, config);

    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests beyond the limit", () => {
    const id = "test-beyond-limit";
    const config = { limit: 2, windowMs: 60000 };

    rateLimit(id, config);
    rateLimit(id, config);
    const blocked = rateLimit(id, config);

    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();

    const id = "test-window-reset";
    const config = { limit: 1, windowMs: 10000 };

    const r1 = rateLimit(id, config);
    expect(r1.success).toBe(true);

    const r2 = rateLimit(id, config);
    expect(r2.success).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(11000);

    const r3 = rateLimit(id, config);
    expect(r3.success).toBe(true);

    vi.useRealTimers();
  });

  it("uses independent stores for different store types", () => {
    const id = "test-store-independence";
    const config = { limit: 1, windowMs: 60000 };

    const r1 = rateLimit(id, { ...config, storeType: "checkin" as const });
    expect(r1.success).toBe(true);

    const r2 = rateLimit(id, { ...config, storeType: "messaging" as const });
    expect(r2.success).toBe(true);
  });
});

describe("cleanupExpiredEntries", () => {
  it("removes expired entries", () => {
    vi.useFakeTimers();

    const id = "test-cleanup";
    const config = { limit: 5, windowMs: 5000 };

    rateLimit(id, config);

    // Advance past window
    vi.advanceTimersByTime(6000);

    cleanupExpiredEntries();

    // After cleanup, a new request should get full remaining count
    const result = rateLimit(id, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);

    vi.useRealTimers();
  });
});
