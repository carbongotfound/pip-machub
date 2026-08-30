# Pip Mac Hub

## Product goal

Turn Pip into a single-user, local-first agent hub whose source of truth runs on a Mac mini and whose chat experience is available from the macOS app or an installable browser PWA on iPhone, iPad, Android, Windows, and macOS.

The product keeps the upstream messaging model: bots are contacts, channels are project rooms, every bot has its own instructions and runtime, and bots can delegate work to other bots. It does not copy X/Grok trademarks, proprietary artwork, or unreleased implementation details.

The user-facing product name is **Pip**. Existing `openmausbot` protocol schemes, package identifiers, and data-directory names remain internal compatibility details so an existing installation can upgrade without losing bots or pairing state.

## Target user and core jobs

- One owner operates the Mac mini and controls device access.
- The owner chats with individual agents and multi-agent channels from any paired device.
- Agents continue work on the Mac mini while clients disconnect.
- Conversations, configuration, credentials, memories, and workspaces remain on the Mac mini unless a configured model or connector necessarily receives them.
- The owner can install the same responsive UI as a mobile or desktop PWA.

## In scope

- macOS desktop package as the primary host and control plane.
- One shared harness and one persistent local data directory.
- An HTTPS PWA reached through Tailscale Serve.
- Short-lived, single-use pairing initiated on the Mac.
- HttpOnly browser sessions; native mobile bearer authentication remains supported.
- Per-device capabilities for high-risk remote administration and interactive computer access.
- Responsive chat, roster, channels, approvals, tasks, routines, animated modular mascot customization, voice, connected apps, and agent collaboration using the existing Pip UI and API.
- Docker-based headless/development deployment where host macOS computer control is not required.
- Explicit context budgets and compact transcript retrieval to reduce repeat tokens without silently dropping pinned instructions or the active task.

## Out of scope

- A native Windows host application.
- Public anonymous or multi-tenant hosting.
- Copying Grok Bot branding, icons, mascots, exact assets, or private behavior.
- Claiming mathematically zero accuracy loss from context reduction. The implementation preserves protected context and makes compaction observable, but model behavior cannot be guaranteed identical.
- macOS Accessibility, Screen Recording, Apple dictation, or host-computer control from inside Docker. Those capabilities require the signed native app and macOS permission boundary.

## Acceptance criteria

1. The macOS host remains bound to loopback; remote clients reach only the companion gateway.
2. The PWA is installable over a Tailscale-provided HTTPS origin and has mobile/desktop icons, standalone display metadata, safe-area layout, and an offline shell.
3. An unpaired browser can only load static PWA assets, health, and pairing/session endpoints.
4. Pairing requires a Mac-opened, two-minute, single-use credential. The resulting browser credential is HttpOnly and is never returned to application JavaScript.
5. State-changing browser requests require a same-origin HTTPS request and a custom CSRF header; native clients continue to use bearer tokens without an Origin header.
6. New devices receive ordinary chat access only. Remote administration and interactive desktop access are separately enabled from the Mac.
7. Revoking a device invalidates its API access and closes its live event streams.
8. The PWA and macOS app read and mutate the same Mac-owned bots, channels, messages, routines, and task state.
9. Docker can build and start the harness plus PWA gateway with persistent data mounts and a health check.
10. Type checking, focused unit/integration tests, production builds, responsive browser checks, and an adversarial security pass have recorded evidence before a production-ready claim.

## Assumptions

- Tailscale is installed and the owner is signed into the same tailnet on the Mac mini and remote devices.
- The Mac mini remains powered on and the desktop app or headless services remain running.
- This is a personal deployment. Adding multiple human accounts or public internet access requires a different authorization and tenancy design.
- Provider CLIs and subscriptions are governed by their own terms; a ChatGPT Plus subscription is not interchangeable with OpenAI API credit, while the Codex CLI may use an existing supported login.
