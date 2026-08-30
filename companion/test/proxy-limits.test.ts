import { createServer, request, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { createProxyHandler } from "../src/proxy.ts";

const servers: Server[] = [];

const listen = async (server: Server): Promise<number> => {
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  // SAFETY: listen has completed successfully on an ephemeral TCP port, so
  // Node returns an AddressInfo object rather than a pipe-name string/null.
  return (server.address() as { port: number }).port;
};

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections?.();
          server.close(() => resolve());
        }),
    ),
  );
});

describe("proxy resource limits", () => {
  it("rejects a declared oversized body before opening an upstream request", async () => {
    let upstreamRequests = 0;
    const harnessPort = await listen(
      createServer((_req, res) => {
        upstreamRequests += 1;
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      }),
    );
    const proxyPort = await listen(
      createServer(
        createProxyHandler({
          harnessPort,
          authenticate: () => ({ id: "phone", cloudDesktopAccess: false }),
          redeem: () => ({ error: "not pairing" }),
          serverName: () => "Test computer",
        }),
      ),
    );

    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const outbound = request(
        {
          hostname: "127.0.0.1",
          port: proxyPort,
          method: "POST",
          path: "/api/bots/example/messages",
          headers: {
            authorization: "Bearer test",
            "content-length": String(20 * 1024 * 1024 + 1),
          },
        },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
          incoming.on("end", () =>
            resolve({
              status: incoming.statusCode ?? 0,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      outbound.on("error", reject);
      outbound.end();
    });

    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toEqual({ error: "request body too large" });
    expect(upstreamRequests).toBe(0);
  });

  it("applies the mutation brake in the authenticated proxy path", async () => {
    let upstreamRequests = 0;
    const harnessPort = await listen(
      createServer((_req, res) => {
        upstreamRequests += 1;
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      }),
    );
    const proxyPort = await listen(
      createServer(
        createProxyHandler({
          harnessPort,
          authenticate: (token) =>
            token ? { id: token, cloudDesktopAccess: false } : null,
          redeem: () => ({ error: "not pairing" }),
          serverName: () => "Test computer",
        }),
      ),
    );

    const send = (token: string) =>
      fetch(`http://127.0.0.1:${proxyPort}/api/bots/example/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });

    for (let index = 0; index < 90; index += 1) {
      expect((await send("phone-a")).status).toBe(200);
    }
    const limited = await send("phone-a");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect((await send("phone-b")).status).toBe(200);
    expect(upstreamRequests).toBe(91);
  });
});
