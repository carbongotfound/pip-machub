import { useEffect, useState, type ReactNode } from "react";
import { Check, AlertTriangle, Loader2, Mic } from "lucide-react";
import { identifyEmail, setEmailGateDone, track } from "@/lib/analytics";
import { useDesktopCapabilities } from "./DesktopCapabilities";
import { EngineSetup } from "./EngineSetup";
import { ProviderMark } from "./ProviderIcons";
import { PhoneSetupFlow } from "./PhoneSetupFlow";
import { useStore, type InstanceInfo } from "@/state/store";
import { CharacterSetupStep, type CharacterDraft } from "./CharacterSetupStep";

// First-run onboarding: optional local profile, live engine checks, a real
// first-agent character editor, macOS permissions, then optional phone setup.
// Every check is skippable — onboarding must never brick the app.

type InstanceRow = InstanceInfo;

function StatusRow({
  ok,
  warn,
  title,
  detail,
  mark,
  children,
}: {
  ok: boolean;
  warn?: boolean;
  title: string;
  detail?: string;
  mark?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-card p-3.5">
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-success/15 text-success" : warn ? "bg-warning/15 text-warning" : "bg-raised text-ink-secondary"
        }`}
      >
        {ok ? <Check size={14} /> : <AlertTriangle size={13} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
          {mark}
          <span className="min-w-0 truncate">{title}</span>
        </div>
        {detail && <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">{detail}</div>}
        {children}
      </div>
    </div>
  );
}

/** One engine on the setup screen: what it's called, what the harness
 * found, and the one-liner to show when it's good to go. Ready states get
 * a sentence; anything the user has to act on gets the shared setup UI, so
 * the instructions come from the driver and are correct for this platform. */
interface EngineEntry {
  instance: InstanceRow;
  label: string;
  readyNote: string;
}

function engineReady(instance: InstanceRow): boolean {
  return (
    instance.snapshot.state === "available" &&
    (instance.access === "custom" || instance.snapshot.authenticated !== false)
  );
}

function engineTitle({ instance, label }: EngineEntry): string {
  const version = instance?.snapshot.version ? ` · ${instance.snapshot.version.split(" ")[0]}` : "";
  return `${label}${version}`;
}

/** A ready engine needs no attention: a small tile in the grid, so five
 * engines don't read as one long list where the good news and the setup
 * work look the same. */
function ReadyTile(entry: EngineEntry) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-card p-3">
      <ProviderMark driverKind={entry.instance.driverKind} size={17} />
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-medium text-ink">{engineTitle(entry)}</div>
        <div className="mt-0.5 text-[12px] leading-snug text-ink-secondary">{entry.readyNote}</div>
      </div>
    </div>
  );
}

/** An engine that still needs installing or signing in keeps the full-width
 * row: the command box and terminal button need the room. */
function SetupRow(entry: EngineEntry) {
  return (
    <StatusRow
      ok={false}
      warn
      title={engineTitle(entry)}
      mark={<ProviderMark driverKind={entry.instance.driverKind} size={16} />}
    >
      <EngineSetup
        instance={entry.instance}
        className="mt-0.5"
        intent={entry.instance.access === "custom" ? "inject" : "cloud"}
      />
    </StatusRow>
  );
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { capabilities } = useDesktopCapabilities();
  const { state, dispatch, flushBotPatches } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instances, setInstances] = useState<InstanceRow[] | null>(null);
  const [perms, setPerms] = useState<{ mic: string } | null>(null);
  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const firstBot = state.bots.find((bot) => !bot.hidden) ?? state.bots[0];
  const flow = capabilities.dictation.available ? [0, 1, 2, 3, 4] : [0, 1, 2, 4];
  const progress = Math.max(0, flow.indexOf(step));

  const saveProfile = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) identifyEmail(cleanEmail);
    const profile = cleanEmail
      ? { name: name.trim(), email: cleanEmail }
      : { name: name.trim() };
    // persisted server-side (~/.openmausbot/config.json) — the sidebar
    // footer reads it back through /api/config
    void fetch("/api/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    }).catch(() => {});
    setStep(1);
  };

  const saveCharacter = async (draft: CharacterDraft) => {
    if (!firstBot) return;
    dispatch({
      type: "updateBot",
      botId: firstBot.id,
      patch: {
        name: draft.name,
        title: draft.title,
        description: draft.description,
        color: draft.color,
        mascotExpression: draft.mascotExpression,
        mascotBody: draft.mascotBody,
        mascotEyes: draft.mascotEyes,
        mascotAccessory: draft.mascotAccessory,
      },
    });
    await flushBotPatches(firstBot.id);
    setStep(capabilities.dictation.available ? 3 : 4);
  };

  useEffect(() => {
    track("onboarding_step", { step });
  }, [step]);

  useEffect(() => {
    if (step !== 1) return;
    let active = true;
    let latestRequest = 0;
    const refresh = () => {
      const request = ++latestRequest;
      fetch("/api/instances")
        .then((r) => r.json())
        .then((d) => active && request === latestRequest && setInstances(d.instances ?? []))
        .catch(() => active && request === latestRequest && setInstances([]));
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [step]);

  useEffect(() => {
    if (step === 3 && capabilities.dictation.available) {
      const poll = () => window.ogb?.permStatus?.().then(setPerms).catch(() => {});
      poll();
      // keep polling — the user may grant in System Settings and come back
      const t = setInterval(poll, 2000);
      return () => clearInterval(t);
    }
  }, [step, capabilities.dictation.available]);

  const finish = () => {
    track("onboarding_completed", {
      engines_available: instances?.filter((i) => i.snapshot.state === "available").length ?? -1,
      mic: perms?.mic ?? "n/a",
    });
    setEmailGateDone("submitted");
    onDone();
  };

  const engines: EngineEntry[] = (instances ?? [])
    .filter((instance) => instance.install)
    .map((instance) => ({
      instance,
      label: instance.displayName,
      readyNote:
        instance.access === "custom"
          ? "Installed — ready for a local model."
          : "Installed — ready to power bots.",
    }));
  const readyEngines = engines.filter((e) => engineReady(e.instance));
  const setupEngines = engines.filter((e) => !engineReady(e.instance));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-app p-4 sm:p-8">
      <div className="pointer-events-none absolute -left-32 top-[-12rem] size-[32rem] rounded-full bg-accent/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-52 right-[-8rem] size-[30rem] rounded-full bg-success/5 blur-[130px]" />
      {/* the engines step lays tiles out two across, so it gets more room —
          but never more than the window: the panel caps at the viewport and
          the engine list scrolls inside it, so the header and Continue stay
          put and nothing runs into the edges */}
      <div
        className={`relative flex max-h-full w-full flex-col rounded-[24px] border border-hairline/40 bg-panel/95 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8 ${step === 1 ? "max-w-[680px]" : step === 2 ? "max-w-[920px]" : step === 4 ? "max-w-[620px]" : "max-w-[480px]"}`}
      >
        <div className="mb-6 flex items-center justify-between gap-4" aria-label={`Setup step ${progress + 1} of ${flow.length}`}>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-secondary">Pip setup</div>
          <div className="flex items-center gap-1.5">
            {flow.map((flowStep, index) => (
              <span
                key={flowStep}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === progress ? "w-7 bg-accent" : index < progress ? "w-3 bg-accent/55" : "w-3 bg-control"}`}
              />
            ))}
          </div>
        </div>
        {step === 0 && (
          <div className="flex flex-col items-center">
            <div className="relative flex size-[116px] items-center justify-center overflow-hidden rounded-[30px] bg-[#171327] ring-1 ring-[#493b8f]/60 shadow-[0_22px_70px_rgba(57,42,124,0.28)]">
              <img
                src="/pip-mascot.png"
                alt="Pip, the wide-eyed companion"
                className="size-[108px] object-contain transition-transform duration-500 hover:rotate-[-3deg] hover:scale-105"
              />
            </div>
            <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.04em] text-ink">Hi, I&rsquo;m Pip.</h1>
            <p className="mt-2 max-w-[42ch] text-center text-[13.5px] leading-relaxed text-ink-secondary">
              I&rsquo;ll help you create a private team of characters that can chat, build, research, and work together from your Mac mini.
            </p>
            <label className="mt-6 w-full">
              <span className="mb-1.5 block text-[12px] text-ink-secondary">What should your crew call you?</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or nickname"
              className="w-full rounded-xl border border-hairline/40 bg-inset px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-secondary focus:border-accent-border focus:outline-none"
            />
            </label>
            <label className="mt-3 w-full">
              <span className="mb-1.5 flex items-center justify-between text-[12px] text-ink-secondary"><span>Email</span><span>optional</span></span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && emailValid && saveProfile()}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-hairline/40 bg-inset px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-secondary focus:border-accent-border focus:outline-none"
            />
            </label>
            <button
              onClick={saveProfile}
              disabled={!emailValid}
              className="mt-4 w-full rounded-xl bg-accent py-2.5 text-[14px] font-medium text-white transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
            >
              Start the tour
            </button>
            <button
              onClick={() => {
                track("email_skipped");
                setStep(1);
              }}
              className="mt-3 text-[12px] text-ink-secondary hover:text-ink"
            >
              Skip profile
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex min-h-0 flex-col">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Choose the first brain</h1>
            <p className="mt-1 text-[13.5px] text-ink-secondary">
              Pip found the AI tools on this Mac. Your existing Codex login can power the first character.
            </p>
            <div className="mt-4 flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {!instances ? (
                <div className="flex items-center gap-2 py-6 text-ink-secondary">
                  <Loader2 size={16} className="animate-spin" /> Checking…
                </div>
              ) : (
                <>
                  {readyEngines.length > 0 && (
                    <>
                      <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-secondary">Ready</div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {readyEngines.map((e) => (
                          <ReadyTile key={e.label} {...e} />
                        ))}
                      </div>
                    </>
                  )}
                  {setupEngines.length > 0 && (
                    <>
                      <div className={`text-[11.5px] font-medium uppercase tracking-wide text-ink-secondary ${readyEngines.length ? "mt-2" : ""}`}>
                        Needs setup
                      </div>
                      {setupEngines.map((e) => (
                        <SetupRow key={e.label} {...e} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setStep(2)}
              className="mt-5 w-full shrink-0 rounded-xl bg-accent py-2.5 text-[14px] font-medium text-white transition hover:brightness-110 active:scale-[0.99]"
            >
              Design my first character
            </button>
          </div>
        )}

        {step === 2 && (
          firstBot ? (
            <CharacterSetupStep bot={firstBot} onBack={() => setStep(1)} onSave={saveCharacter} />
          ) : (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-[13px] text-ink-secondary">
              <Loader2 size={16} className="animate-spin" /> Preparing your first character…
            </div>
          )
        )}

        {step === 3 && (
          <div className="flex flex-col">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Add a voice when you want one</h1>
            <p className="mt-1 text-[13.5px] text-ink-secondary">
              Microphone access is optional and only used when you start dictation or a call.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-card p-3.5">
                <div className="flex items-start gap-3">
                  <Mic size={18} className="mt-0.5 shrink-0 text-ink-secondary" />
                  <div>
                    <div className="text-[14px] font-medium text-ink">Microphone & speech</div>
                    <div className="mt-0.5 text-[12.5px] text-ink-secondary">
                      Voice dictation into the composer, transcribed on-device.
                    </div>
                  </div>
                </div>
                {perms?.mic === "granted" ? (
                  <Check size={16} className="shrink-0 text-success" />
                ) : perms?.mic === "denied" || perms?.mic === "restricted" ? (
                  <button
                    onClick={() => window.ogb?.permOpenSettings?.("mic")}
                    className="shrink-0 rounded-lg bg-raised px-3 py-1.5 text-[13px] text-ink hover:bg-raised-hover"
                  >
                    Open Settings
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      window.ogb?.permRequestMic?.().then(() => window.ogb?.permStatus?.().then(setPerms))
                    }
                    className="shrink-0 rounded-lg bg-raised px-3 py-1.5 text-[13px] text-ink hover:bg-raised-hover"
                  >
                    Enable
                  </button>
                )}
              </div>
              {/* Screen Recording deliberately has no row here: macOS 15+
                  makes a pre-grant unreliable (per-process status caching,
                  helper misattribution, periodic re-prompts) — the OS flow
                  triggers on the first real capture in the Computer panel,
                  which is the moment the user has context for the dialog. */}
            </div>
            <button onClick={() => setStep(4)} className="mt-5 w-full rounded-xl bg-accent py-2.5 text-[14px] font-medium text-white transition hover:brightness-110 active:scale-[0.99]">
              Connect my devices
            </button>
            <button onClick={() => setStep(4)} className="mt-3 text-[12px] text-ink-secondary hover:text-ink">
              Skip for now
            </button>
          </div>
        )}

        {step === 4 && (
          <PhoneSetupFlow
            variant="onboarding"
            profileEmail={email}
            onSkip={() => {
              track("phone_setup_skipped");
              finish();
            }}
            onComplete={() => {
              track("phone_setup_completed");
              finish();
            }}
          />
        )}

      </div>
    </div>
  );
}
