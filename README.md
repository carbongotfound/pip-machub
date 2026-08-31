# Pip

Pip is a local-first desktop hub for a private team of customizable AI characters. Run agents from your Mac, give each one its own personality and working context, and chat with them like contacts.

> Pip is an experimental open-source project. It is designed to run locally and connect to remote devices through a private network.

## What Pip does

- Run multiple AI characters from one workspace
- Give every character its own name, role, personality, model, effort, computer, and working folder
- Stream replies, tool activity, approvals, and progress into one chat interface
- Keep bots, conversations, projects, and pairing records on the Mac hub
- Connect a phone or Windows PC through a private Tailscale PWA
- Use animated mascot profiles with editable bodies, eyes, accessories, colors, and expressions
- Support local agent CLIs and connected apps while keeping approval controls visible

## How it is structured

- **Desktop app:** Electron shell with the Pip interface
- **Client:** React, TypeScript, Vite, and Tailwind
- **Server:** Local HTTP and SSE harness for bots, tools, approvals, computer use, and model drivers
- **Companion:** Optional local service for paired devices
- **PWA:** Remote access to the Mac hub over a private Tailscale address
- **Cloudflare services:** Optional broker and control-plane components

## Quick start

Pip is source code, not a pre-signed application.

### macOS

1. Read [SETUP.md](SETUP.md).
2. Install Node.js 24 or newer, pnpm, and Apple's command-line tools.
3. Run [SETUP-MAC.command](SETUP-MAC.command) and follow the wizard.
4. For ChatGPT access, sign in through the official Codex CLI with `codex login`.
5. Keep approval prompts enabled until you understand what an agent can do.

The Mac stores the local hub data. Read [docs/PWA-TAILSCALE.md](docs/PWA-TAILSCALE.md) before enabling phone or Windows access.

### Development

```sh
pnpm install
pnpm dev
```

Useful commands:

```sh
pnpm dev:server
pnpm dev:desktop
pnpm typecheck
pnpm lint
pnpm test
```

## Project layout

```
src/                 Pip client and shared UI
server/              Local agent harness and provider drivers
companion/           Optional paired-device service
electron/            Desktop shell and native helpers
ios/                 Companion iOS source
apps/docs/            Documentation site
cloudflare/           Optional broker and control plane
scripts/              Build and verification scripts
```

## Security notes

Pip can give agents powerful tools. Use it on a private network, keep approvals enabled, and review [docs/SECURITY-RED-TEAM.md](docs/SECURITY-RED-TEAM.md) and [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) before unattended use.

Never put passwords, ChatGPT credentials, API keys, or private tokens in the repository. Do not expose the Mac hub directly to the public internet.

## Contributing

Bug reports, documentation improvements, tests, and new provider drivers are welcome. Start by reading the relevant documentation and explain how you reproduced a change.

## License

Pip is released under the [Apache License 2.0](LICENSE).
