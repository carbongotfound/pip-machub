#!/bin/bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [[ -t 1 ]]; then
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  CYAN=$'\033[36m'
  GREEN=$'\033[32m'
  YELLOW=$'\033[33m'
  RED=$'\033[31m'
  RESET=$'\033[0m'
else
  BOLD="" DIM="" CYAN="" GREEN="" YELLOW="" RED="" RESET=""
fi

line() { printf '──────────────────────────────────────────────────────────\n'; }
pause() { read -r -p "Press Return when you're ready… " _ || true; }

ask_yes_no() {
  local prompt="$1"
  local answer=""
  read -r -p "$prompt [Y/n] " answer || true
  [[ -z "$answer" || "$answer" =~ ^[Yy]$ ]]
}

status() {
  printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"
}

chapter() {
  printf '\n%s' "$CYAN"
  line
  printf '%s  %s%s\n' "$BOLD" "$1" "$RESET"
  printf '%s' "$CYAN"
  line
  printf '%s' "$RESET"
}

fail() {
  printf '\n%sSetup paused:%s %s\n' "$RED" "$RESET" "$1" >&2
  printf '%sNothing private was uploaded, and no ChatGPT password or API key was requested.%s\n' "$DIM" "$RESET" >&2
  read -r -p "Press Return to close… " _ || true
  exit 1
}

on_error() {
  printf '\n%sThe build stopped near line %s.%s\n' "$RED" "$1" "$RESET" >&2
  printf 'The useful error is directly above this message. Read SETUP.md, fix it, then run this wizard again.\n' >&2
  read -r -p "Press Return to close… " _ || true
}
trap 'on_error "$LINENO"' ERR

clear 2>/dev/null || true
printf '%s\n' "$CYAN"
printf '              ╭─────────────╮\n'
printf '              │  ◉       ◉  │\n'
printf '              │      ᴗ      │\n'
printf '              ╰──── PIP ─────╯\n'
printf '%s\n' "$RESET"
printf '%sPip and your private crew are about to come online.%s\n' "$BOLD" "$RESET"
printf 'This wizard checks the Mac, tests the secure phone app, and builds your local installer.\n\n'
printf '%sWhat it will not do:%s ask for your password, publish a port, enable Tailscale Funnel, or weaken Gatekeeper.\n\n' "$DIM" "$RESET"

if ! ask_yes_no "Ready to build Pip on this Mac?"; then
  printf '\nNo problem. Double-click this wizard whenever you want to continue.\n'
  exit 0
fi

chapter "1 of 5 · Meet the Mac"
[[ "$(uname -s)" == "Darwin" ]] || fail "This wizard must run on macOS."
status "macOS detected ($(sw_vers -productVersion))"
status "Architecture: $(uname -m)"

if ! command -v node >/dev/null 2>&1; then
  printf '  %s•%s Node.js 24+ is needed. Opening the official download page…\n' "$YELLOW" "$RESET"
  open "https://nodejs.org/en/download"
  fail "Install Node.js 24+, then run this wizard again."
fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "$NODE_MAJOR" -lt 24 ]]; then
  open "https://nodejs.org/en/download"
  fail "Node.js 24+ is required; this Mac has $(node --version)."
fi
status "Node $(node --version)"

command -v corepack >/dev/null 2>&1 || fail "Corepack is missing. Reinstall the current Node.js 24 release."
status "Locked package runner available"

if ! command -v xcrun >/dev/null 2>&1 || ! xcrun --find swiftc >/dev/null 2>&1; then
  printf '  %s•%s Apple build tools are missing. macOS will show its installer now.\n' "$YELLOW" "$RESET"
  xcode-select --install 2>/dev/null || true
  fail "Finish installing Apple's command-line tools, then run this wizard again."
fi
status "Apple Swift build tools"

FREE_KB="$(df -Pk "$PROJECT_DIR" | awk 'NR == 2 { print $4 }')"
[[ "${FREE_KB:-0}" -ge 12582912 ]] || fail "At least 12 GB of free disk space is required for the Mac build."
status "Enough free disk space"

if command -v tailscale >/dev/null 2>&1 || [[ -d "/Applications/Tailscale.app" ]]; then
  status "Tailscale found"
else
  printf '  %s•%s Tailscale is not installed yet. It is optional for the build and required for private phone/Windows access.\n' "$YELLOW" "$RESET"
  if ask_yes_no "Open the Tailscale download page now?"; then
    open "https://tailscale.com/download/mac"
  fi
fi

if command -v codex >/dev/null 2>&1; then
  status "Codex CLI found"
else
  printf '  %s•%s Codex is not installed yet. Pip can still build; the in-app tour will help connect an engine.\n' "$YELLOW" "$RESET"
  if ask_yes_no "Open the official Codex setup page in your browser?"; then
    open "https://developers.openai.com/codex/cli"
  fi
fi

printf '\n%sNext: dependency installation. This downloads the exact versions locked by the project.%s\n' "$DIM" "$RESET"
pause

chapter "2 of 5 · Gather the parts"
corepack pnpm@10.33.0 install --frozen-lockfile
status "Dependencies match the lockfile"

chapter "3 of 5 · Safety scan"
corepack pnpm@10.33.0 typecheck
corepack pnpm@10.33.0 exec oxlint \
  companion/src/pwa.ts \
  companion/src/rate-limit.ts \
  src/components/PwaGate.tsx \
  src/components/Avatar.tsx \
  src/components/BotProfileAvatarCard.tsx \
  src/components/CharacterSetupStep.tsx \
  src/components/Onboarding.tsx \
  src/lib/pwa-fetch.ts \
  src/state/bot-patch-queue.ts \
  shared/mascot-profile.ts \
  server/bot-profile.ts
status "Types and focused security/style rules passed"

chapter "4 of 5 · Test the portal"
printf '%sThis launches a temporary local hub, pairs a pretend device, checks CSRF and permissions, then shuts it down.%s\n\n' "$DIM" "$RESET"
corepack pnpm@10.33.0 smoke:pwa
status "Secure PWA pairing flow passed"

chapter "5 of 5 · Build Pip"
printf '%sThis is the long part: macOS builds the app and both Mac installer architectures.%s\n\n' "$DIM" "$RESET"
# A personal source build normally has no paid Developer ID certificate.
# Disable certificate auto-discovery explicitly; never read a random keychain
# identity or ask the user to weaken Gatekeeper globally.
CSC_IDENTITY_AUTO_DISCOVERY=false corepack pnpm@10.33.0 package:mac

case "$(uname -m)" in
  arm64) DMG_PATTERN="release/Pip-*-arm64.dmg" ;;
  x86_64) DMG_PATTERN="release/Pip-*-x64.dmg" ;;
  *) fail "Unsupported Mac architecture: $(uname -m)" ;;
esac

# SAFETY: the pattern is fixed above to one of two project-owned release
# locations. Packaging must have produced at least one matching DMG.
DMG_PATH="$(ls -t $DMG_PATTERN 2>/dev/null | head -n 1 || true)"
[[ -n "$DMG_PATH" && -f "$DMG_PATH" ]] || fail "The build finished without the expected Pip DMG in the release folder."

trap - ERR
chapter "Pip is ready"
printf 'Installer: %s%s%s\n\n' "$BOLD" "$PROJECT_DIR/$DMG_PATH" "$RESET"
printf 'After installation, the playful in-app tour lets you:\n'
printf '  1. Choose Codex or another engine\n'
printf '  2. Pick a Builder, Scout, Creative, or Captain character\n'
printf '  3. Customize its body, eyes, accessory, personality, expression, avatar, and voice\n'
printf '  4. Pair your phone or Windows PWA privately\n\n'

if ask_yes_no "Open the installer now?"; then
  open "$DMG_PATH"
fi

printf '\n%sSmall macOS note:%s because this is your own unsigned local build, Control-click Pip in Applications and choose Open the first time. Do not disable Gatekeeper.\n' "$YELLOW" "$RESET"

while true; do
  printf '\nWhat would you like next?\n'
  printf '  1) Open the simple setup guide\n'
  printf '  2) Show the installer in Finder\n'
  printf '  3) Open Codex setup\n'
  printf '  4) Open Tailscale setup\n'
  printf '  5) Finish\n'
  read -r -p "> " choice || choice="5"
  case "$choice" in
    1) open "$PROJECT_DIR/SETUP.md" ;;
    2) open -R "$DMG_PATH" ;;
    3) open "https://developers.openai.com/codex/cli" ;;
    4) open "https://tailscale.com/download/mac" ;;
    5|"") break ;;
    *) printf 'Choose 1, 2, 3, 4, or 5.\n' ;;
  esac
done

printf '\n%sHave fun building your crew. Keep approval prompts on until you trust each character.%s\n\n' "$GREEN" "$RESET"
