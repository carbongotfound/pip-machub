const WINDOW_MS = 60_000;
const MAX_REQUESTS = 300;
const MAX_MUTATIONS = 90;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

interface DeviceWindow {
  startedAt: number;
  requests: number;
  mutations: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** A small per-device abuse brake. It is intentionally not identity or
 * authorization: the route/capability checks remain authoritative. */
export class DeviceRateLimiter {
  private windows = new Map<string, DeviceWindow>();

  check(deviceId: string, method: string, now = Date.now()): RateLimitDecision {
    let window = this.windows.get(deviceId);
    if (!window || now - window.startedAt >= WINDOW_MS) {
      window = { startedAt: now, requests: 0, mutations: 0 };
      this.windows.set(deviceId, window);
    }
    const mutation = !SAFE_METHODS.has(method);
    if (window.requests >= MAX_REQUESTS || (mutation && window.mutations >= MAX_MUTATIONS)) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((window.startedAt + WINDOW_MS - now) / 1_000)),
      };
    }
    window.requests += 1;
    if (mutation) window.mutations += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
