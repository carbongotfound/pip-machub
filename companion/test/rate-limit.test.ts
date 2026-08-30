import { describe, expect, it } from "vitest";

import { DeviceRateLimiter } from "../src/rate-limit.ts";

describe("DeviceRateLimiter", () => {
  it("limits mutation bursts per device without affecting another device", () => {
    const limiter = new DeviceRateLimiter();
    for (let index = 0; index < 90; index += 1) {
      expect(limiter.check("phone-a", "POST", 1_000).allowed).toBe(true);
    }
    expect(limiter.check("phone-a", "POST", 1_000)).toMatchObject({ allowed: false, retryAfterSeconds: 60 });
    expect(limiter.check("phone-b", "POST", 1_000).allowed).toBe(true);
  });

  it("opens a fresh window after one minute", () => {
    const limiter = new DeviceRateLimiter();
    for (let index = 0; index < 300; index += 1) limiter.check("phone", "GET", 2_000);
    expect(limiter.check("phone", "GET", 2_000).allowed).toBe(false);
    expect(limiter.check("phone", "GET", 62_000).allowed).toBe(true);
  });
});
