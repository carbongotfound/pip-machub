# PWA and Tailscale setup

## Recommended: native macOS host

1. Install and sign in to Tailscale on the Mac mini and each client device.
2. Open Pip on the Mac mini and enable **Settings → Phone**.
3. Build/package this fork so the companion receives the PWA bundle.
4. On the Mac mini, expose only the companion through Tailscale Serve:

   ```sh
   tailscale serve --bg http://127.0.0.1:8810
   ```

5. Open the HTTPS tailnet URL printed by Tailscale on the phone or Windows PC.
6. In Pip on the Mac, choose **Pair a phone**. Enter the six-digit code in the PWA.
7. Install it:
   - iPhone/iPad: Safari → Share → Add to Home Screen.
   - Android: Chrome → Install app.
   - Windows/macOS: Chrome or Edge → Install icon in the address bar.
8. If the device needs settings, imports, deletion, or host-affecting actions, enable **Allow full PWA management** for that device on the Mac. Enable **Allow computer view** separately.

Do not use Tailscale Funnel for a personal deployment. Serve keeps the site private to the tailnet; Funnel publishes it to the internet.

## Docker headless mode

```sh
docker compose up --build -d
tailscale serve --bg http://127.0.0.1:8810
```

The named Docker volume stores harness and pairing state. The container does not gain access to macOS Accessibility, Screen Recording, Apple speech, Keychain, or host computer control. Provider CLIs and their login directories are also not included; add only the specific runtime and credential mounts required by a provider rather than mounting the whole home directory or Docker socket.

`compose.yaml` sets `OMB_PWA_TRUST_PROXY=1` because the published port is bound to host loopback and Docker's bridge makes the trusted Tailscale Serve connection appear non-loopback inside the container. Do not copy that setting to a container port exposed on `0.0.0.0` or a public ingress.

## Backups

For the native app, back up `~/.openmausbot` and `~/.openmausbot-companion` while Pip is stopped. For Docker, back up the `openmausbot-data` volume. Provider credentials may have separate stores and are not necessarily covered by these folders.

## Removing remote access

```sh
tailscale serve reset
```

Then disable Phone access in the Mac app. Revoking an individual device from **Settings → Phone** invalidates its session and closes its live stream without affecting other devices.
