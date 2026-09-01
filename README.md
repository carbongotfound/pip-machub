<div align="center">

<img src="public/pip-mascot.png" alt="Pip mascot" width="150">

# Pip

### A local-first hub where AI agents feel like teammates, not browser tabs.

Give each character its own role, model, tools, working folder, approvals, and chat history. Run the team from your Mac and keep the work close to home.

**Pip is an experimental, open-source Grok Bot alternative for people who want a private team of customizable AI characters.**

<img src="docs/screenshots/hero.png" alt="Pip's agent workspace" width="900">

</div>

## Why Pip exists

Most multi-agent tools make a group of processes and call it a team. Then every agent works from a half-remembered summary, output lands in separate places, and nobody can tell who owns the next step.

Pip takes a different shape: agents live in a contact-style sidebar, each with a clear job and working context. You can give a Builder different tools and approval rules from a Reviewer, then keep the handoff visible instead of letting it disappear into a pile of chat bubbles.

It is not magic. It is a workspace for making agent work easier to inspect, steer, and continue.

## Project status and provenance

Pip is an experimental fork built from the OpenMausBot codebase, released under Apache License 2.0. The current work focuses on a Pip-branded local Mac hub, customizable agent characters, private paired-device access, and clearer agent handoffs. See [NOTICE](NOTICE) for third-party notices.

## What it can do

- Run multiple AI characters from one Mac workspace.
- Set a character's role, personality, model, effort, tools, computer, and working folder.
- Stream replies, tool activity, questions, approvals, and progress into chat.
- Keep conversations, projects, and local hub data on the Mac.
- Pair a phone or Windows PC through a private Tailscale PWA.
- Use animated, customizable mascot profiles.
- Connect local agent CLIs such as Codex and Claude while keeping approval controls visible.

<table>
<tr>
<td width="50%" valign="top">

### Give each agent a brain

Choose different models and settings per character. A researcher does not need to behave like the builder, and neither needs to behave like your assistant with a fake moustache.

<img src="docs/screenshots/model-picker.png" alt="Model picker" width="100%">

</td>
<td width="50%" valign="top">

### Keep risky work visible

Questions, tool activity, and approvals stay in the thread, so an agent action does not become a mysterious thing that happened somewhere else.

<img src="docs/screenshots/approval-card.png" alt="Approval card in chat" width="100%">

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Let an agent work with a computer

Open a computer panel for an agent, inspect its work, and take over when needed.

<img src="docs/screenshots/computer-panel.png" alt="Agent computer panel" width="100%">

</td>
<td width="50%" valign="top">

### Treat agents like contacts

Characters are people-shaped on purpose. Their job, context, tools, and history are all visible from the workspace instead of buried inside a prompt.

<img src="docs/screenshots/context-menu.png" alt="Agent context menu" width="100%">

</td>
</tr>
</table>

## Try this first

The fastest useful test is an artifact handoff:

1. Create a **Builder** and a **Reviewer**.
2. Ask Builder to make a small webpage in its working folder.
3. Ask Reviewer to inspect and improve the actual files, not a summary of what Builder says it made.
4. Report where the handoff breaks, feels confusing, or needs another approval screen.

That test is more valuable than a star. If it works, say so. If it fails, open an issue with the smallest reproduction you can manage.

## Quick start, macOS

Pip is source code at the moment, not a signed app download.

1. Read [SETUP.md](SETUP.md).
2. Install Node.js 24 or newer, pnpm, and Apple's command-line tools.
3. Run SETUP-MAC.command and follow the wizard.
4. For ChatGPT access, sign in through the official Codex CLI with codex login.

Keep approvals enabled until you understand what an agent can do. The Mac stores the local hub data. Read [PWA and Tailscale setup](docs/PWA-TAILSCALE.md) before enabling phone or Windows access.

### Development

~~~sh
pnpm install
pnpm dev:server
pnpm dev
pnpm dev:desktop
~~~

Useful commands:

~~~sh
pnpm typecheck
pnpm lint
pnpm test
~~~

## How it is structured

- **Desktop app:** Electron shell with the Pip workspace.
- **Client:** React, TypeScript, Vite, and Tailwind.
- **Server:** Local HTTP and SSE harness for bots, tools, approvals, computer use, and model drivers.
- **Companion:** Optional service for paired devices.
- **PWA:** Remote access to the Mac hub over a private Tailscale address.

## Security

Pip can give agents powerful tools. Use it on a private network, keep approvals enabled, and read [SECURITY-RED-TEAM.md](docs/SECURITY-RED-TEAM.md) and [PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) before unattended use.

Never put passwords, ChatGPT credentials, API keys, or private tokens in this repository. Do not expose the Mac hub directly to the public internet.

## Contributing

Bug reports, documentation improvements, tests, and provider drivers are welcome. If you try Pip, the most useful report is a real workflow that failed, including what you expected the agent team to do and where it went sideways.

## License

Pip is released under the Apache License 2.0.
