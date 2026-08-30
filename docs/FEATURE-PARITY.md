# Feature coverage

This matrix compares the requested Grok-Bot-style experience with capabilities verified in this fork. Grok Bot is proprietary and changes independently, so “everything” cannot honestly include private, undocumented, or future behavior.

| Capability | Status in this fork | Notes |
|---|---|---|
| Bot roster as contacts | Included upstream | Pin, hide, duplicate, unread, profiles, avatars, per-bot models and instructions. |
| Project channels / bot rooms | Included upstream | Shared context, working folder, roster, responder rules, tasks, and group calls. |
| Bots talk to and delegate to bots | Included upstream | Bounded peer-agent tools, delegation status, depth controls, and user-visible activity. |
| Models from existing local CLIs | Included upstream | Codex, Claude, Grok, Hermes, Gemini, Qwen, Kimi, OpenCode and other detected engines; availability depends on installed/logged-in CLIs. |
| Approvals and steering | Included upstream | Permission cards, allow/deny, questions, interrupts, always-allow keys, and decision log. |
| Routines and webhook triggers | Included upstream | Scheduled/queued work, retries, receipts, pause/run/cancel, dedicated webhook listener. |
| Connected apps | Included upstream | Composio catalog and multi-account OAuth; third-party account/terms may apply. |
| Cloud and isolated computers | Included upstream | Box, BYO VPS Docker computers, Local VM, screenshots, control handoff. |
| This Mac control | macOS native app only | Requires explicit Accessibility and Screen Recording permission; never available from the Docker container by accident. |
| Voice, dictation, and calls | Included upstream | ElevenLabs TTS/calls; Apple on-device dictation requires native macOS app. Browser microphone behavior depends on browser permission/support. |
| Themes and customization | Included upstream | Skins, bot identity/voice/avatar/model, app settings, section context, team imports and playbooks. |
| Character creator | Expanded in Pip | First-run live preview with Builder, Scout, Creative, and Captain presets; six bodies, four eye styles, six accessories, ten colors, animated state expressions, name, role, and real personality instructions. Appearance syncs through the Mac-owned profile API. The full profile also supports uploaded/generated avatars and per-agent voice. |
| Guided setup | Expanded in Pip | Interactive Mac build wizard plus an in-app progress tour for profile, engines, first character, optional voice, and private device pairing. |
| Mobile browser app | Added in this fork | Responsive installable PWA using the same React UI and Mac-owned state. |
| Desktop browser app on Windows | Added in this fork | Installable PWA; no Windows native host required. |
| Cross-device live sync | Added/verified | One REST hydration plus SSE stream against the Mac mini source of truth. |
| Secure Tailscale access | Added in this fork | Tailscale Serve HTTPS, HttpOnly sessions, strict same-origin/CSRF checks, route allowlist, per-device capabilities. |
| Docker deployment | Added in this fork | Headless harness + PWA gateway with persistent volume and health check; no macOS host control. |
| Offline transcript access | Not included | The shell can open offline, but private chats/API data are intentionally not put in service-worker caches. |
| Push notifications while closed | Not included | No APNs/Web Push service is configured. The PWA receives live updates while connected. |
| Managed public cloud / always-on hosting | Not included by default | The Mac mini must remain on. Tailscale Serve keeps access private; public Funnel is discouraged. |
| Included model/API usage | Not included | This fork uses your configured CLI login, subscription, local model, or API key. ChatGPT Plus is not general OpenAI API credit. |
| Exact Grok branding/assets | Intentionally not included | The interaction model is similar, but X/Grok trademarks and proprietary visual assets are not copied. |
| Arbitrary remote images in PWA messages | Intentionally blocked | The PWA CSP blocks external image hosts to prevent tracking/exfiltration pixels; local, uploaded, data, and blob images work. |

## Accuracy of this comparison

“Included upstream” means the checked-out OpenMausBot v0.1.38 source contains the feature and tests/docs for it. “Added” means this fork contains implementation and focused verification. Items that require a real Mac permission prompt, Tailscale account, provider login, App Store distribution, or a proprietary Grok Bot account remain environment-dependent and are not represented as fully verified here.
