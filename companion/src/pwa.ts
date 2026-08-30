import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";

export const PWA_SESSION_COOKIE = "omb_pwa_session";
export const PWA_CSRF_HEADER = "x-openmausbot-pwa";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const mimeType = (extension: string): string => {
  switch (extension) {
    case ".css": return "text/css; charset=utf-8";
    case ".html": return "text/html; charset=utf-8";
    case ".ico": return "image/x-icon";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".js": return "text/javascript; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".png": return "image/png";
    case ".svg": return "image/svg+xml";
    case ".webmanifest": return "application/manifest+json; charset=utf-8";
    case ".webp": return "image/webp";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
};

const splitCookies = (value: string | undefined): Map<string, string> => {
  const cookies = new Map<string, string>();
  for (const part of String(value ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    try {
      cookies.set(key, decodeURIComponent(raw));
    } catch {
      // A malformed cookie cannot authenticate and must not abort the request.
    }
  }
  return cookies;
};

export const pwaSessionToken = (req: IncomingMessage): string | undefined =>
  splitCookies(req.headers.cookie).get(PWA_SESSION_COOKIE);

/** Browsers cannot set Sec-Fetch-* or Origin. Cookie alone also classifies a
 * navigation where a browser legitimately omitted Origin. */
export const isPwaRequest = (req: IncomingMessage): boolean =>
  Boolean(
    req.headers.origin ||
      req.headers.cookie ||
      req.headers["sec-fetch-site"],
  );

const authorityHost = (authority: string): string => {
  try {
    return new URL(`http://${authority}`).hostname.toLowerCase();
  } catch {
    return "";
  }
};

export interface PwaRequestCheck {
  ok: boolean;
  status: number;
  error?: string;
  secure: boolean;
}

const isLoopbackPeer = (address: string | undefined): boolean =>
  address === "127.0.0.1" ||
  address === "::1" ||
  address === "::ffff:127.0.0.1";

/** Validate a browser API request against the exact origin that reached this
 * listener. Tailscale Serve preserves Host and adds X-Forwarded-Proto. We do
 * not trust X-Forwarded-Host because a direct client can forge it. */
export function validatePwaRequest(
  req: IncomingMessage,
  options: { trustProxy?: boolean } = {},
): PwaRequestCheck {
  const method = req.method ?? "GET";
  const directAuthority = String(req.headers.host ?? "");
  const forwardedHost = String(req.headers["x-forwarded-host"] ?? "").split(",")[0].trim();
  const proxyHeadersTrusted = options.trustProxy === true || isLoopbackPeer(req.socket.remoteAddress);
  const authority = proxyHeadersTrusted && forwardedHost ? forwardedHost : directAuthority;
  const host = authorityHost(authority);
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  // SAFETY: Node's HTTP socket may be a TLSSocket at runtime; this optional
  // structural read grants no authority unless it is exactly true.
  const secure =
    (proxyHeadersTrusted && forwardedProto === "https") ||
    Boolean((req.socket as { encrypted?: boolean }).encrypted);
  const loopbackDev = LOOPBACK.has(host) && isLoopbackPeer(req.socket.remoteAddress);

  if (!authority || !host) return { ok: false, status: 400, error: "invalid host", secure };
  if (!secure && !loopbackDev) {
    return { ok: false, status: 426, error: "the PWA requires HTTPS; use Tailscale Serve", secure };
  }

  const site = String(req.headers["sec-fetch-site"] ?? "").toLowerCase();
  if (site && site !== "same-origin" && site !== "none") {
    return { ok: false, status: 403, error: "forbidden: cross-site request", secure };
  }

  const origin = String(req.headers.origin ?? "");
  if (origin) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      return { ok: false, status: 403, error: "forbidden: invalid origin", secure };
    }
    let expected: URL;
    try {
      expected = new URL(`${secure ? "https" : "http"}://${authority}`);
    } catch {
      return { ok: false, status: 400, error: "invalid host", secure };
    }
    if (parsed.origin.toLowerCase() !== expected.origin.toLowerCase()) {
      return { ok: false, status: 403, error: "forbidden: cross-origin request", secure };
    }
  }

  if (!SAFE_METHODS.has(method)) {
    if (!origin) {
      return { ok: false, status: 403, error: "forbidden: missing origin", secure };
    }
    if (String(req.headers[PWA_CSRF_HEADER] ?? "") !== "1") {
      return { ok: false, status: 403, error: "forbidden: CSRF check failed", secure };
    }
  }

  return { ok: true, status: 200, secure };
}

export const pwaSessionCookie = (token: string, secure: boolean): string =>
  [
    `${PWA_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
    "Max-Age=2592000",
  ]
    .filter(Boolean)
    .join("; ");

export const clearPwaSessionCookie = (secure: boolean): string =>
  [
    `${PWA_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Do not let model-rendered markdown or a tracking pixel turn the browser
  // into an exfiltration channel. PWA images must be local, uploaded, or
  // embedded. The native Electron surface keeps its existing behavior.
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const staticHeaders = (cacheControl: string) => ({
  "cache-control": cacheControl,
  "content-security-policy": CONTENT_SECURITY_POLICY,
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy": "camera=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
});

/** Serve only a built Vite tree. Returns false for API paths or when PWA
 * serving is disabled, allowing the proxy handler to continue. */
export function servePwaAsset(
  req: IncomingMessage,
  res: ServerResponse,
  configuredRoot: string | undefined,
): boolean {
  const method = req.method ?? "GET";
  if (!configuredRoot || !["GET", "HEAD"].includes(method)) return false;
  const rawPath = new URL(req.url ?? "/", "http://companion.invalid").pathname;
  if (rawPath.startsWith("/api/")) return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    res.writeHead(400, staticHeaders("no-store"));
    res.end();
    return true;
  }
  if (decoded.includes("\0") || decoded.split("/").some((part) => part.startsWith("."))) {
    res.writeHead(404, staticHeaders("no-store"));
    res.end();
    return true;
  }

  let root: string;
  try {
    root = realpathSync(configuredRoot);
  } catch {
    return false;
  }
  const candidate = resolve(root, `.${decoded === "/" ? "/index.html" : decoded}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    res.writeHead(404, staticHeaders("no-store"));
    res.end();
    return true;
  }

  let file = candidate;
  try {
    if (!existsSync(file) || !statSync(file).isFile()) file = resolve(root, "index.html");
    const realFile = realpathSync(file);
    if (!realFile.startsWith(`${root}${sep}`) || extname(realFile) === ".map") throw new Error("outside root");
    const body = readFileSync(realFile);
    const immutable = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\./.test(decoded);
    const cacheControl = immutable
      ? "public, max-age=31536000, immutable"
      : extname(realFile) === ".html"
        ? "no-cache"
        : "public, max-age=3600";
    const etag = `"${createHash("sha256").update(body).digest("base64url").slice(0, 24)}"`;
    const presented = String(req.headers["if-none-match"] ?? "");
    const sameEtag =
      presented.length === etag.length &&
      timingSafeEqual(Buffer.from(presented), Buffer.from(etag));
    if (sameEtag) {
      res.writeHead(304, { ...staticHeaders(cacheControl), etag });
      res.end();
      return true;
    }
    res.writeHead(200, {
      ...staticHeaders(cacheControl),
      "content-type": mimeType(extname(realFile).toLowerCase()),
      "content-length": body.byteLength,
      etag,
    });
    if (method === "HEAD") res.end();
    else res.end(body);
  } catch {
    res.writeHead(404, staticHeaders("no-store"));
    res.end();
  }
  return true;
}
