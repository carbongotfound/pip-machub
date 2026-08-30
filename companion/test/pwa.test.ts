import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  PWA_SESSION_COOKIE,
  clearPwaSessionCookie,
  pwaSessionCookie,
  pwaSessionToken,
  servePwaAsset,
  validatePwaRequest,
} from "../src/pwa.ts";

interface RequestFixture {
  method?: string;
  headers?: IncomingMessage["headers"];
  url?: string;
  remoteAddress?: string;
}

const request = ({
  method = "GET",
  headers = { host: "mac.tailnet.ts.net" },
  url,
  remoteAddress = "127.0.0.1",
}: RequestFixture = {}) =>
  // SAFETY: the unit under test reads only these explicitly supplied HTTP
  // fields; no real socket or parser behavior is claimed by this fixture.
  ({
    method,
    headers,
    socket: { remoteAddress },
    url,
  }) as IncomingMessage;

describe("PWA request validation", () => {
  it("requires HTTPS away from loopback", () => {
    expect(validatePwaRequest(request())).toMatchObject({ ok: false, status: 426 });
  });

  it("accepts a same-origin Tailscale HTTPS mutation with layered CSRF checks", () => {
    expect(
      validatePwaRequest(
        request({
          method: "POST",
          headers: {
            host: "mac.tailnet.ts.net",
            origin: "https://mac.tailnet.ts.net",
            "x-forwarded-proto": "https",
            "sec-fetch-site": "same-origin",
            "x-openmausbot-pwa": "1",
          },
        }),
      ),
    ).toMatchObject({ ok: true, secure: true });
  });

  it("rejects foreign origins, cross-site fetches, and missing CSRF headers", () => {
    const base = {
      host: "mac.tailnet.ts.net",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "same-origin",
    };
    expect(
      validatePwaRequest(request({ method: "POST", headers: { ...base, origin: "https://evil.example", "x-openmausbot-pwa": "1" } })),
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      validatePwaRequest(request({ method: "POST", headers: { ...base, origin: "https://mac.tailnet.ts.net", "sec-fetch-site": "cross-site", "x-openmausbot-pwa": "1" } })),
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      validatePwaRequest(request({ method: "POST", headers: { ...base, origin: "https://mac.tailnet.ts.net" } })),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("does not trust forwarded HTTPS from a remote peer unless explicitly configured", () => {
    const remote = request({
      remoteAddress: "192.0.2.44",
      headers: {
        host: "127.0.0.1:8810",
        "x-forwarded-host": "mac.tailnet.ts.net",
        "x-forwarded-proto": "https",
      },
    });
    expect(validatePwaRequest(remote)).toMatchObject({ ok: false, status: 426 });
    expect(validatePwaRequest(remote, { trustProxy: true })).toMatchObject({ ok: true, secure: true });
  });
});

describe("PWA session cookie", () => {
  it("is HttpOnly, strict, scoped, and secure on HTTPS", () => {
    const cookie = pwaSessionCookie("omb_secret", true);
    expect(cookie).toContain(`${PWA_SESSION_COOKIE}=omb_secret`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Path=/");
    expect(clearPwaSessionCookie(true)).toContain("Max-Age=0");
  });

  it("parses only the named cookie and survives malformed neighbors", () => {
    const req = request({ headers: { cookie: `bad=%E0%A4%A; ${PWA_SESSION_COOKIE}=omb_ok; other=x` } });
    expect(pwaSessionToken(req)).toBe("omb_ok");
  });
});

describe("PWA static assets", () => {
  let root = "";
  afterEach(() => root && rmSync(root, { recursive: true, force: true }));

  const serve = (url: string) => {
    const headers: Record<string, string | number> = {};
    let status = 0;
    let body: Uint8Array = new Uint8Array();
    const res = {
      writeHead(nextStatus: number, nextHeaders: Record<string, string | number>) {
        status = nextStatus;
        Object.assign(headers, nextHeaders);
      },
      end(chunk?: Buffer | string) {
        body = Buffer.isBuffer(chunk) ? new Uint8Array(chunk) : Buffer.from(chunk ?? "");
      },
    };
    // SAFETY: servePwaAsset uses only writeHead/end on this response fixture.
    const handled = servePwaAsset(request({ url }), res as ServerResponse, root);
    return { handled, status, headers, body: Buffer.from(body).toString("utf8") };
  };

  it("serves the shell with security headers and never falls through paths or source maps", () => {
    root = mkdtempSync(join(tmpdir(), "omb-pwa-"));
    mkdirSync(join(root, "assets"));
    writeFileSync(join(root, "index.html"), "<main>safe</main>");
    writeFileSync(join(root, "assets", "app-12345678.js"), "export{};");
    writeFileSync(join(root, "assets", "app.js.map"), "secret source");

    const shell = serve("/");
    expect(shell).toMatchObject({ handled: true, status: 200, body: "<main>safe</main>" });
    expect(shell.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(shell.headers["content-security-policy"]).toContain("img-src 'self' data: blob:");
    expect(shell.headers["content-security-policy"]).not.toContain("img-src 'self' data: blob: https:");
    expect(shell.headers["cache-control"]).toBe("no-cache");
    expect(serve("/assets/app-12345678.js").headers["cache-control"]).toContain("immutable");
    expect(serve("/assets/app.js.map").status).toBe(404);
    expect(serve("/../devices.json").body).toBe("<main>safe</main>");
    expect(serve("/.env").status).toBe(404);
  });
});
