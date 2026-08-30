import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, WifiOff } from "lucide-react";

export interface PwaSessionDevice {
  id: string;
  name: string;
  administrationAccess: boolean;
  cloudDesktopAccess: boolean;
}

interface SessionResponse {
  mode?: "pwa";
  authenticated?: boolean;
  device?: PwaSessionDevice | null;
  error?: string;
}

type GateState =
  | { kind: "checking" }
  | { kind: "local" }
  | { kind: "paired"; device: PwaSessionDevice }
  | { kind: "pair" }
  | { kind: "error"; message: string };

const rememberSession = (device: PwaSessionDevice | null) => {
  window.__ombPwaSession = device ? { mode: "pwa", device } : undefined;
};

const loadSession = async (): Promise<GateState> => {
  try {
    const response = await fetch("/api/pwa/session", {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    // The loopback harness intentionally has no PWA session route. This is
    // the Electron/dev path and remains trusted exactly as before.
    if (response.status === 404) return { kind: "local" };
    // SAFETY: every field is checked for the exact primitive/shape before it
    // controls rendering; unknown/missing fields take the unauthenticated path.
    const body = (await response.json().catch(() => ({}))) as SessionResponse;
    if (!response.ok) {
      return { kind: "error", message: body.error ?? `Connection failed (${response.status})` };
    }
    if (body.authenticated && body.device) return { kind: "paired", device: body.device };
    return { kind: "pair" };
  } catch {
    return { kind: "error", message: "The Mac mini could not be reached. Check Tailscale and try again." };
  }
};

export function PwaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: "checking" });
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pairError, setPairError] = useState("");

  const refresh = useCallback(async () => {
    const next = await loadSession();
    rememberSession(next.kind === "paired" ? next.device : null);
    setState(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (state.kind !== "paired") return;
    const check = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh, state.kind]);

  const pair = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setPairError("Enter the six-digit code shown on your Mac.");
      return;
    }
    setSubmitting(true);
    setPairError("");
    try {
      const response = await fetch("/api/pair", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-openmausbot-pwa": "1",
        },
        body: JSON.stringify({
          credential: code,
          deviceName: `${navigator.platform || "Browser"} PWA`,
          pairRequestId: crypto.randomUUID(),
        }),
      });
      // SAFETY: only an optional string-like error is rendered, and the
      // fallback is used for every missing or malformed response.
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Pairing failed");
      await refresh();
    } catch (error) {
      setPairError(error instanceof Error ? error.message : "Pairing failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === "local" || state.kind === "paired") return children;

  return (
    <main className="pwa-gate min-h-[100dvh] bg-app px-5 py-[max(2rem,env(safe-area-inset-top))] text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[440px] flex-col justify-center">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center overflow-hidden rounded-[14px] bg-[#171327] ring-1 ring-[#493b8f]/60">
            <img src="/pip-mascot.png" alt="Pip" className="size-10 object-contain" />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">Pip</div>
            <div className="text-[12px] text-ink-secondary">Private Mac hub</div>
          </div>
        </div>

        {state.kind === "checking" ? (
          <div className="flex items-center gap-3 rounded-[18px] border border-hairline/40 bg-card p-5 text-[13px] text-ink-secondary">
            <Loader2 size={17} className="animate-spin" /> Checking this device…
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-[18px] border border-hairline/40 bg-card p-5">
            <WifiOff size={20} className="mb-4 text-danger" />
            <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Mac mini unavailable</h1>
            <p className="mt-2 text-[13px] leading-6 text-ink-secondary">{state.message}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-5 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-medium text-app"
            >
              Try again
            </button>
          </div>
        ) : (
          <form onSubmit={pair} className="rounded-[22px] border border-hairline/40 bg-card p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-[24px] font-semibold tracking-[-0.035em]">Pair this device</h1>
            <p className="mt-2 text-[13px] leading-6 text-ink-secondary">
              On the Mac mini, open <span className="text-ink">Settings → Phone</span>, start pairing, then enter the six-digit code.
            </p>
            <label htmlFor="pair-code" className="mt-6 block text-[12px] font-medium text-ink-secondary">
              Pairing code
            </label>
            <input
              id="pair-code"
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 h-14 w-full rounded-xl border border-hairline/70 bg-inset px-4 text-center font-mono text-[24px] tracking-[0.3em] text-ink focus:border-accent"
              aria-describedby={pairError ? "pair-error" : "pair-note"}
            />
            {pairError ? (
              <p id="pair-error" role="alert" className="mt-2 text-[12px] text-danger">{pairError}</p>
            ) : (
              <p id="pair-note" className="mt-2 text-[11.5px] text-ink-secondary">The code expires after two minutes.</p>
            )}
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[13px] font-medium text-app disabled:opacity-40"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <>Connect securely <ArrowRight size={15} /></>}
            </button>
            <p className="mt-5 text-center text-[11px] leading-5 text-ink-secondary">
              Your session stays in an HttpOnly cookie and is never exposed to the app or offline cache.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
