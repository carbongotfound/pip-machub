# Threat model

## Protected assets

- Local conversations, memories, attachments, workspaces, and agent outputs.
- Provider, connector, and webhook credentials.
- Authority to send prompts, approve tool actions, change configuration, delete data, or control computers.
- The local user account and filesystem privileges inherited by agent CLIs.
- Paired-device credentials and the privacy of device metadata.

## Roles and actors

- **Mac owner:** trusted to administer the deployment and grant device capabilities.
- **Paired device:** authenticated but not automatically trusted for administration or interactive computer access.
- **Agent:** can act only through its configured driver, tools, and approval policy; model output is untrusted.
- **Network attacker:** may observe or alter ordinary LAN traffic, scan the companion port, or try DNS rebinding.
- **Malicious website:** can cause a browser to send some requests but cannot set protected headers or read HttpOnly cookies.
- **Stolen paired device:** possesses a browser cookie or native token until revoked.
- **Malicious retrieved content/connector:** may contain prompt injection or exfiltration instructions.

## Trust boundaries and entry points

| Boundary | Entry points | Required controls |
|---|---|---|
| Browser → companion | static files, session, pairing, REST, SSE | HTTPS, exact same origin, HttpOnly SameSite cookie, CSRF header, input limits, route allowlist |
| Native phone → companion | pairing, REST, SSE | high-entropy bearer token, no Origin, route allowlist, response scrubbing |
| Companion → harness | loopback HTTP | fixed loopback destination, header allowlist, no client Host/Origin/Auth forwarding |
| Harness → agents/tools | CLI protocols, MCP, connectors, computers | permission broker, bounded schemas, least privilege, no shell interpolation |
| Filesystem | static assets, uploads, workspaces, config | canonical paths, size/type limits, restrictive permissions, atomic writes |

## Security invariants

1. The harness never binds to a non-loopback interface.
2. No remote request reaches an unknown future harness route by default.
3. A browser session token is never available to application JavaScript or stored in localStorage/IndexedDB.
4. A foreign-origin page cannot pair, mutate state, or use an authenticated cookie.
5. Pairing and capability changes can only be initiated from the loopback control plane.
6. Pairing alone does not grant remote administration or desktop control.
7. Provider secrets are never returned by API, SSE, static files, logs, or PWA caches.
8. Revocation invalidates new requests and terminates live event streams.
9. Public/Tailscale-facing responses are not shared-cacheable.
10. Agent/tool output is rendered as untrusted content and cannot expand gateway authorization.
11. Authenticated devices have bounded request and mutation rates, and request/JSON response bodies have hard ceilings.

## Primary abuse cases

- Brute-force the six-digit fallback during its short window.
- Steal/replay a native bearer token or PWA cookie.
- Use CSRF, DNS rebinding, a malicious service worker, or a cross-origin iframe to drive the Mac.
- Traverse the static root or request source maps/secrets.
- Exploit an overbroad proxy route to reach credentials, webhooks, deletion, or local computer control.
- Keep access after device revocation through an existing SSE connection.
- Exhaust memory with large unauthenticated bodies or large proxied JSON responses.
- Inject instructions through a webpage, file, connector result, or another agent and persuade a tool to exceed user intent.
- Exfiltrate data through a model/provider, connector, generated link, logs, or browser cache.

## Mitigations and residual risks

- Tailscale WireGuard and HTTPS protect transport on the recommended route. Plain LAN HTTP is not a supported PWA security posture.
- Pairing windows expire in two minutes, permit five wrong attempts, and are single-use. The manual code remains weaker than the QR credential, so QR is preferred.
- Device tokens are random 256-bit values and stored as hashes on disk. A stolen unlocked device remains usable until the owner revokes it.
- SameSite cookies, exact Origin/Host matching, Fetch Metadata, and a non-simple CSRF header are layered. Compromise of the PWA origin or Mac process defeats these browser controls.
- The proxy uses explicit route/capability lists and scrubs provider resume cursors. A mistakenly classified route is still a security risk and requires review/tests.
- PWA cache rules exclude all `/api/` paths and sensitive response types. A user can still take screenshots or copy content on an authorized device.
- AI prompt injection cannot be eliminated. Tool scopes, approvals, status capsules, and explicit delegation contracts reduce impact; unattended workflows retain residual risk proportional to their permissions.
- Docker isolates processes from the Mac only to the degree of its mounts and socket access. Mounting the Docker socket or broad home directories is explicitly unsupported.
