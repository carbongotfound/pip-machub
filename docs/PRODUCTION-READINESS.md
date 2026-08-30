# Production-readiness gates

The code in this fork is a **production candidate**, not a signed production release. The automated checks available in this workspace pass; hardware-, macOS-, browser-, and distribution-specific gates still need to run on the target Mac mini.

## Verified here

| Gate | Result |
| --- | --- |
| TypeScript typecheck | Pass |
| Vite web/PWA production build | Pass |
| Server and companion builds | Pass |
| Focused PWA, authorization, device, rate-limit, transcript, and proxy tests | Pass |
| End-to-end PWA pairing/session/admin/CSRF/logout smoke | Pass |
| Electron companion/guardian tests | Pass |
| Production dependency audit | No known vulnerabilities reported on 2026-08-28 |
| Compose file parse | Pass |
| Whitespace/error-marker check | Pass |

## Required on the Mac mini before relying on it

- [ ] Build, sign, notarize, install, launch, quit, and relaunch the macOS app.
- [ ] Confirm the harness remains loopback-only with `lsof -nP -iTCP -sTCP:LISTEN`.
- [ ] Run `tailscale serve --bg http://127.0.0.1:8810` and verify the generated HTTPS URL from a second tailnet device.
- [ ] Pair by QR, lock the phone, reopen the PWA, and confirm session restoration.
- [ ] Install the PWA from Safari on iPhone/iPad and Chrome/Edge on Windows; verify safe-area layout, keyboard behavior, offline shell, reconnect, and notifications currently supported by the web UI.
- [ ] Verify bot creation, room/channel use, agent delegation, task/routine changes, approval handling, file upload, and logout from the PWA.
- [ ] Confirm a normal paired device cannot administer; enable administration on one test device, verify it, then disable it and verify immediate denial.
- [ ] Revoke a device while its event stream is open and confirm it disconnects.
- [ ] If Docker is wanted, build with Docker Desktop on Apple Silicon, start with Compose, and verify persistent data after a container recreation. Treat Docker as headless/PWA mode only.
- [ ] Run the full test suite in an environment that permits Unix sockets and multicast/UDP.

## Known release caveats

- Browser visual automation could not run here because no supported browser binary or browser-control runtime is installed.
- Docker itself is not installed in this workspace, so the image has not been built; only the Dockerfile/Compose configuration and entrypoint were statically checked.
- The full companion test suite includes Unix-socket and multicast tests that this hosted environment prohibits. Focused TCP/PWA/security suites pass.
- The upstream lint baseline contains a large pre-existing backlog. The changed code typechecks and targeted tests pass, but repository-wide lint is not a green release gate yet.
- No web-push/background notification service was added. Installed PWAs work as secure responsive clients, but browser notification behavior is not equivalent to every native or proprietary Grok feature.
- No proprietary Grok branding, source code, private APIs, or unverifiable server-side behavior is copied. See `FEATURE-PARITY.md` for the explicit comparison.

