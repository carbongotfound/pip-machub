import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "openmausbot-pwa-smoke-"));
const children = [];
let logs = "";

const freePorts = async (span) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const base = 30_000 + Math.floor(Math.random() * 10_000);
    const held = [];
    let available = true;
    for (let offset = 0; offset < span; offset += 1) {
      const server = createServer();
      try {
        await new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(base + offset, "127.0.0.1", resolve);
        });
        held.push(server);
      } catch {
        available = false;
        break;
      }
    }
    await Promise.all(held.map((server) => new Promise((resolve) => server.close(resolve))));
    if (available) return base;
  }
  throw new Error("could not reserve smoke-test ports");
};

const base = await freePorts(13);
const harnessPort = base;
const webhookPort = base + 1;
const companionPort = base + 10;
const controlPort = base + 11;
const origin = `http://127.0.0.1:${companionPort}`;

const launch = (entry, env) => {
  const child = spawn(process.execPath, [join(root, entry)], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  children.push(child);
  child.stdout.on("data", (chunk) => (logs += chunk));
  child.stderr.on("data", (chunk) => (logs += chunk));
  return child;
};

const stop = async () => {
  for (const child of children) child.kill("SIGTERM");
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) return resolve();
          const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
          child.once("close", () => {
            clearTimeout(timer);
            resolve();
          });
        }),
    ),
  );
  rmSync(scratch, { recursive: true, force: true });
};

const waitFor = async (url, timeoutMs = 20_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return response;
    } catch {
      // Still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for ${url}\n${logs}`);
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  launch("dist-server/index.js", {
    OMB_DATA_DIR: join(scratch, "data"),
    OMB_PORT: String(harnessPort),
    OMB_WEBHOOK_PORT: String(webhookPort),
    OMB_STATIC_DIR: join(root, "dist"),
    OMB_SKILLS_DIR: join(root, "skills"),
  });
  await waitFor(`http://127.0.0.1:${harnessPort}/api/health`);

  launch("dist-companion/index.js", {
    OMB_COMPANION_DIR: join(scratch, "companion"),
    OMB_PORT: String(harnessPort),
    OMB_WEBHOOK_PORT: String(webhookPort),
    OMB_COMPANION_PORT: String(companionPort),
    OMB_CONTROL_PORT: String(controlPort),
    OMB_PWA_DIR: join(root, "dist"),
    OMB_COMPANION_NAME: "PWA smoke Mac",
  });
  await waitFor(`${origin}/api/health`);

  const shell = await fetch(`${origin}/`);
  expect(shell.ok && (await shell.text()).includes("<div id=\"root\"></div>"), "PWA shell did not load");
  expect(shell.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), "PWA CSP missing");
  expect((await fetch(`${origin}/manifest.webmanifest`)).ok, "manifest did not load");
  expect((await fetch(`${origin}/sw.js`)).ok, "service worker did not load");

  const open = await fetch(`http://127.0.0.1:${controlPort}/pairing`, { method: "POST" });
  const pairing = await open.json();
  expect(/^\d{6}$/.test(pairing.code), "control plane did not issue a pairing code");

  const browserHeaders = {
    origin,
    "sec-fetch-site": "same-origin",
    "x-openmausbot-pwa": "1",
    "content-type": "application/json",
  };
  const paired = await fetch(`${origin}/api/pair`, {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({ credential: pairing.code, deviceName: "Smoke PWA", pairRequestId: crypto.randomUUID() }),
  });
  const pairedBody = await paired.json();
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  expect(paired.status === 201 && cookie.startsWith("omb_pwa_session="), "PWA pairing did not mint a cookie");
  expect(!("token" in pairedBody), "raw token leaked into browser pairing JSON");

  const session = await fetch(`${origin}/api/pwa/session`, { headers: { cookie, "sec-fetch-site": "same-origin" } });
  const sessionBody = await session.json();
  expect(sessionBody.authenticated === true, "paired cookie did not authenticate");
  expect(sessionBody.device.administrationAccess === false, "administration was not off by default");

  const bots = await fetch(`${origin}/api/bots`, { headers: { cookie, "sec-fetch-site": "same-origin" } });
  expect(bots.ok, "ordinary paired chat route failed");
  const deniedAdmin = await fetch(`${origin}/api/decisions`, { headers: { cookie, "sec-fetch-site": "same-origin" } });
  expect(deniedAdmin.status === 404, "administration route opened before capability grant");

  const missingCsrf = await fetch(`${origin}/api/pwa/logout`, {
    method: "POST",
    headers: { cookie, origin, "sec-fetch-site": "same-origin" },
  });
  expect(missingCsrf.status === 403, "mutation without CSRF header was accepted");

  await fetch(`http://127.0.0.1:${controlPort}/devices/${sessionBody.device.id}/administration`, { method: "POST" });
  const allowedAdmin = await fetch(`${origin}/api/decisions`, { headers: { cookie, "sec-fetch-site": "same-origin" } });
  expect(allowedAdmin.ok, "granted administration route remained closed");
  const unknown = await fetch(`${origin}/api/future-admin-route`, { headers: { cookie, "sec-fetch-site": "same-origin" } });
  expect(unknown.status === 404, "unknown future route did not fail closed");

  const logout = await fetch(`${origin}/api/pwa/logout`, {
    method: "POST",
    headers: { ...browserHeaders, cookie },
    body: "{}",
  });
  expect(logout.ok && logout.headers.get("set-cookie")?.includes("Max-Age=0"), "logout did not clear the cookie");

  console.log("PWA smoke passed: shell, pairing, HttpOnly session, CSRF, capability gates, and fail-closed routing");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(logs);
  process.exitCode = 1;
} finally {
  await stop();
}
