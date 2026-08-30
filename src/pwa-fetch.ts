const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** Install once before React. Browser mutations to this origin receive the
 * non-simple CSRF header required by the companion. Electron's loopback
 * harness ignores it, so the application keeps one API call surface. */
export function installPwaFetchProtection(): void {
  if (window.__ombFetchProtectionInstalled) return;
  window.__ombFetchProtectionInstalled = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const source = input instanceof Request ? input.url : String(input);
    let url: URL;
    try {
      url = new URL(source, window.location.href);
    } catch {
      return original(input, init);
    }
    const method = String(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/") || SAFE.has(method)) {
      return original(input, init);
    }
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    headers.set("x-openmausbot-pwa", "1");
    return original(input, { ...init, credentials: "same-origin", headers });
  };
}
