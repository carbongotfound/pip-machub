# Security red-team record

Date: 2026-08-28

Scope: the browser PWA, companion gateway, Mac control plane, Tailscale Serve path, Docker packaging, cross-device sessions, and transcript replay changes in this fork.

This is an engineering review record, not a certification or a promise that the software is vulnerability-free.

## Result

The reviewed design is suitable for a **private production candidate** on a personal tailnet after the Mac/Tailscale/device checks in `PRODUCTION-READINESS.md` pass. It is not approved for public internet exposure. Tailscale Funnel is intentionally unsupported.

One medium-severity trust-boundary issue was found and fixed during the review: the localhost HTTP development exception accepted a loopback-looking `Host` without proving that the TCP peer was loopback. It now requires both an actual loopback peer and a loopback `Host`. Forwarded protocol/host headers are accepted only from a loopback proxy or when the operator explicitly enables proxy trust (the Docker bridge case). Regression tests cover both conditions.

## Attack matrix

| Attack | Expected result | Evidence/status |
| --- | --- | --- |
| Foreign `Origin` uses a paired cookie | 403 before authorization | Automated PWA validation tests pass |
| Cross-site mutation without CSRF header | 403 | Automated PWA validation and smoke tests pass |
| JavaScript reads the device bearer | No bearer in JSON or browser storage; HttpOnly cookie only | Pairing/session smoke test passes; source inspection complete |
| DNS rebinding or forged localhost host | Host/origin must match; localhost HTTP also requires a loopback peer | Regression tests pass; issue found and fixed in this review |
| Forged `X-Forwarded-*` headers | Ignored unless the direct peer is loopback or explicit proxy trust is enabled | Automated tests pass |
| Pairing-code brute force | Two-minute window, five failed attempts, single use; QR credential preferred | Existing registry tests pass |
| Paired phone reaches credentials/internal APIs | Default deny; `/api/internal/**` remains unreachable | Route and proxy integration tests pass |
| New upstream route is exposed accidentally | Unknown future routes fail closed | Route and smoke tests pass |
| Pairing silently grants admin or cloud desktop | Both capabilities default off and are stored per device | Device and route tests pass |
| Compromised device floods the gateway | Per-device 60-second request/mutation limits; 429 with `Retry-After` | Rate-limiter tests pass |
| Oversized request or response exhausts memory | 20 MB proxied request cap; bounded pairing JSON, JSON responses, and SSE frames | Typechecked; limit/unit/proxy tests pass |
| Static path traversal, dotfile, or source-map request | Denied | PWA static tests pass |
| Sensitive API response enters PWA cache | Service worker never caches `/api/**`; gateway emits private/no-store headers | Source inspection and smoke headers pass |
| Model-rendered image contacts an attacker host | PWA CSP permits only same-origin, data, and blob images | Static-header regression test passes |
| Device continues an SSE stream after revocation | Active stream is terminated | Proxy integration test passes |
| Provider cursor/secret crosses proxy | Response scrubber removes known sensitive fields | Wire and proxy integration tests pass |
| Dependency has a known production vulnerability | Build blocked for review | `pnpm audit --prod` reports none on 2026-08-28 |
| Repository contains an obvious committed credential | Build/test fixtures are the only private-key matches | Targeted secret scan complete |
| Public internet reaches the gateway | Unsupported; do not use Funnel or router port-forwarding | Configuration/documentation control |

## Residual risks

- A stolen, unlocked, already-paired device remains authorized until it is revoked on the Mac. The PWA session cookie lasts up to 30 days.
- A compromised Mac process or compromised PWA origin defeats the browser-layer controls.
- Model prompt injection cannot be eliminated. Tool approvals, route scopes, explicit capabilities, and visible delegation reduce impact but do not make unattended powerful agents risk-free.
- Tailscale account compromise or an overly broad tailnet ACL can expose the PWA to unintended tailnet members.
- Docker does not provide macOS Accessibility, Screen Recording, Apple speech, or native host-control permissions. Broad host mounts or a Docker socket mount would materially weaken isolation and are unsupported.
- The exact Mac package, Tailscale Serve route, Safari/Chrome installation, and real-device UI have not been exercised in this Linux workspace. Those are release gates, not assumed successes.

## Operator rules

1. Bind the harness and native companion to loopback.
2. Publish only with Tailscale Serve; never enable Funnel or router port forwarding.
3. Use the QR pairing credential when possible and revoke devices you no longer control.
4. Grant administration and cloud-desktop capabilities only to devices that need them.
5. Keep macOS, Tailscale, OpenMausBot, Docker Desktop (if used), and model CLIs updated.
6. Do not mount the Docker socket, the whole home directory, SSH keys, or provider credential directories into the container.
