# Pip: easy Mac mini setup

This ZIP contains source code, not a pre-signed app from an identified Apple developer. Your Mac builds the app locally, then you install the generated DMG. The Mac mini stores the bots, chats, projects, and pairing records locally; your phone and Windows PC connect to it through a private Tailscale HTTPS address.

## What you need

1. A Mac mini with at least 12 GB of free space.
2. [Node.js 24 or newer](https://nodejs.org/en/download).
3. Apple command-line tools. In Terminal, run:

   ```sh
   xcode-select --install
   ```

4. [Tailscale](https://tailscale.com/download/mac) installed and signed in on the Mac, phone, and Windows PC.
5. At least one supported agent CLI. For your ChatGPT subscription, the simplest choice is the [official Codex CLI](https://developers.openai.com/codex/cli).

Never paste a ChatGPT password or API key into this project or setup script.

## Build and install the Mac app

1. Unzip the download.
2. Open the unzipped `Pip-MacHub` folder.
3. Double-click `SETUP-MAC.command`.
   - If macOS blocks the script, Control-click it, choose **Open**, then choose **Open** again.
   - The colorful wizard talks you through each check, offers the correct Codex and Tailscale pages when something is missing, tests secure PWA pairing, and builds the macOS DMGs.
4. When the build finishes, the correct DMG opens automatically.
5. Drag **Pip** into **Applications**.
6. Open Applications, Control-click **Pip**, and choose **Open**. Use this narrow exception for your own local build; do not disable Gatekeeper globally.

The first build downloads dependencies and native helpers and can take a while. If it fails, copy the final error section—not passwords or files from `~/.codex`—when asking for help.

## Connect your ChatGPT/Codex subscription

Open Terminal and install Codex using the current command shown in the [official Codex CLI quickstart](https://developers.openai.com/codex/cli). Then run:

```sh
codex login
codex login status
```

Choose **Sign in with ChatGPT** in the browser. OpenAI documents this as the subscription-access path; an API key is a separate, usage-billed path. Pip uses the local Codex CLI session and should never ask for your ChatGPT password.

After login, open Pip. Its first-run tour detects Codex and lets you design your first character before entering chat. Keep approval prompts enabled until you understand exactly what each agent can do.

## Customize your characters

The setup tour includes four editable starting characters: Builder, Scout, Creative, and Captain. A preset is only a starting point. Before saving it, you can change:

- Name and role
- Personality and working instructions
- Six mascot bodies, four eye styles, six accessories, ten colors, and animated expressions

After setup, open any agent and choose **Agent profile** for the full editor. Mascots blink, follow the pointer, morph between expressions, and react differently while thinking, searching, working, succeeding, waiting, or failing. Appearance changes save on the Mac and synchronize to paired phone and Windows PWAs. The editor also supports an uploaded avatar, an optional generated avatar, crop shape, voice, speaking behavior, model and effort, computer, working folder, connected apps, teammate-contact rules, and approval behavior. Personality text is sent as actual agent instructions, it is not merely decorative profile text.

## Turn on the private phone/Windows PWA

1. In Pip on the Mac, open **Settings → Phone** and enable phone access.
2. In Terminal on the Mac, run:

   ```sh
   tailscale serve --bg http://127.0.0.1:8810
   tailscale serve status
   ```

3. Tailscale prints a private `https://...ts.net` address. Open that address on your phone or Windows PC while signed in to the same tailnet.
4. On the Mac, choose **Pair a phone**. Enter the six-digit code in the PWA. Use the QR credential when the UI offers it.
5. Install the PWA:
   - iPhone/iPad: Safari → Share → **Add to Home Screen**.
   - Android: Chrome → **Install app**.
   - Windows: Chrome or Edge → click the install icon in the address bar.
6. Ordinary pairing can chat and handle normal work. On the Mac, separately enable **Allow full PWA management** or **Allow computer view** only for a device you trust and only when needed.

Do not enable Tailscale Funnel. Do not forward port 8810 on your router. Tailscale Serve keeps the site private to your tailnet; Funnel would publish it to the internet.

## Keep the Mac mini available

- Leave Pip running.
- In macOS System Settings, prevent automatic sleep while the Mac is acting as the hub.
- The PWA reconnects to the Mac; it is not a separate cloud copy.
- Back up `~/.openmausbot` and `~/.openmausbot-companion` while Pip is stopped.

## Stop remote access

Run:

```sh
tailscale serve reset
```

Then disable phone access in Pip. You can revoke one device under **Settings → Phone** without disconnecting the others.

## Docker (optional, not the recommended Mac setup)

Docker mode is headless: it serves the PWA but cannot use macOS Accessibility, Screen Recording, Apple speech, or native Mac control.

```sh
docker compose up --build -d
tailscale serve --bg http://127.0.0.1:8810
```

Do not mount the Docker socket, your whole home folder, SSH keys, or all provider credentials. See `docs/PWA-TAILSCALE.md` and `docs/SECURITY-RED-TEAM.md` before customizing Docker mounts.

## Important limits

- This is a Grok-Bot-style open-source experience, not proprietary Grok source code or an exact copy of undocumented/private Grok behavior.
- Push notifications while the PWA is fully closed are not included.
- External image URLs are blocked in the PWA to stop tracking/exfiltration pixels. Local and uploaded images still work.
- Token replay is more efficient for long conversations without altering stored canonical messages, but no system can honestly guarantee zero token loss and zero accuracy change in every conversation.
- Before trusting unattended agents with powerful tools, complete `docs/PRODUCTION-READINESS.md` on the actual Mac mini.
