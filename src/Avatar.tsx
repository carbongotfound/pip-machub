// Bot avatar — the Blob Studio "Cursor" mascot (CursorAvatar.tsx), wrapped
// in the app's historical MausAvatar API so no call site changes: per-bot
// color becomes a body gradient, the app's one-shot motion beats borrow the
// face/state for a moment, and the eyes follow the pointer. The previous
// hand-built Maus body + face engine (maus-engine/face/driver) is gone;
// CursorAvatar owns morphing, blinking, drift, body motion and effects.
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MAUS_COLORS, type MausColor, type MausMotion, type MausState } from "@/lib/mascot";
import {
  CursorAvatar,
  DEFAULT_SILHOUETTE,
  type CursorAvatarHandle,
  type CursorSilhouette,
} from "./CursorAvatar";
import { botAvatarProfile, type BotAvatarCrop } from "../../shared/bot-avatar";
import {
  mascotAccessory,
  mascotBody,
  mascotEyes,
  type MascotAccessory,
  type MascotBody,
  type MascotEyes,
} from "../../shared/mascot-profile";

/**
 * The pack's baked-in silhouette was exported with the body fill hardcoded
 * to black instead of the {{GRADIENT}} placeholder the component
 * substitutes, which painted every bot the same. Restore the slot so the
 * per-bot gradient actually lands on the body.
 */
const GRADIENT_SILHOUETTE: CursorSilhouette = {
  ...DEFAULT_SILHOUETTE,
  body: DEFAULT_SILHOUETTE.body.replace(/fill="#000000"/g, 'fill="{{GRADIENT}}"'),
};

const silhouette = (
  name: string,
  body: string,
  clip: string,
  anchor: CursorSilhouette["anchor"] = { x: 3, y: 18, scale: 0.92 },
): CursorSilhouette => ({ name, fit: "", body, clip, anchor });

/** One visual family, six genuinely different bodies. Faces and motion stay
 * shared, so an agent remains recognisable while thinking, working, or
 * appearing at 24px in the sidebar. */
const MASCOT_SILHOUETTES = {
  bean: silhouette(
    "bean",
    '<ellipse cx="114.27" cy="125" rx="96" ry="86" fill="{{GRADIENT}}"/>',
    '<ellipse cx="114.27" cy="125" rx="96" ry="86"/>',
  ),
  sprout: silhouette(
    "sprout",
    '<ellipse cx="114.27" cy="132" rx="91" ry="79" fill="{{GRADIENT}}"/><path d="M93 58 C70 42 72 18 101 34 C113 41 115 54 111 68 Z" fill="{{GRADIENT}}"/><path d="M124 62 C126 35 151 25 157 48 C160 62 145 71 125 73 Z" fill="{{GRADIENT}}"/>',
    '<ellipse cx="114.27" cy="132" rx="91" ry="79"/><path d="M93 58 C70 42 72 18 101 34 C113 41 115 54 111 68 Z"/><path d="M124 62 C126 35 151 25 157 48 C160 62 145 71 125 73 Z"/>',
    { x: 4, y: 25, scale: 0.9 },
  ),
  drop: silhouette(
    "drop",
    '<path d="M114 16 C101 49 36 74 31 132 C27 179 62 211 114 211 C166 211 201 179 197 132 C192 74 127 49 114 16 Z" fill="{{GRADIENT}}"/>',
    '<path d="M114 16 C101 49 36 74 31 132 C27 179 62 211 114 211 C166 211 201 179 197 132 C192 74 127 49 114 16 Z"/>',
    { x: 4, y: 24, scale: 0.9 },
  ),
  flop: silhouette(
    "flop",
    '<ellipse cx="114" cy="135" rx="86" ry="73" fill="{{GRADIENT}}"/><path d="M55 91 C18 71 8 30 31 24 C55 18 73 54 78 91 Z" fill="{{GRADIENT}}"/><path d="M151 87 C158 44 190 33 203 53 C214 72 188 96 157 104 Z" fill="{{GRADIENT}}"/>',
    '<ellipse cx="114" cy="135" rx="86" ry="73"/><path d="M55 91 C18 71 8 30 31 24 C55 18 73 54 78 91 Z"/><path d="M151 87 C158 44 190 33 203 53 C214 72 188 96 157 104 Z"/>',
    { x: 5, y: 29, scale: 0.89 },
  ),
  puff: silhouette(
    "puff",
    '<circle cx="75" cy="126" r="55" fill="{{GRADIENT}}"/><circle cx="116" cy="102" r="70" fill="{{GRADIENT}}"/><circle cx="160" cy="130" r="54" fill="{{GRADIENT}}"/><ellipse cx="116" cy="157" rx="79" ry="55" fill="{{GRADIENT}}"/>',
    '<circle cx="75" cy="126" r="55"/><circle cx="116" cy="102" r="70"/><circle cx="160" cy="130" r="54"/><ellipse cx="116" cy="157" rx="79" ry="55"/>',
    { x: 4, y: 21, scale: 0.91 },
  ),
  bolt: silhouette(
    "bolt",
    '<path d="M91 18 L183 46 L169 91 L209 122 L173 190 L111 207 L42 177 L25 111 L61 80 L54 40 Z" fill="{{GRADIENT}}" stroke="{{GRADIENT}}" stroke-width="12" stroke-linejoin="round"/>',
    '<path d="M91 18 L183 46 L169 91 L209 122 L173 190 L111 207 L42 177 L25 111 L61 80 L54 40 Z" stroke="black" stroke-width="12" stroke-linejoin="round"/>',
    { x: 3, y: 17, scale: 0.92 },
  ),
} satisfies Record<MascotBody, CursorSilhouette>;

const EYE_STYLE = {
  bright: { eyeScale: 1.06, spring: 7, lookAround: 0.28, mouthStroke: 7.5 },
  soft: { eyeScale: 0.92, spring: 5.5, lookAround: 0.18, mouthStroke: 6.5 },
  focused: { eyeScale: 0.78, spring: 8.5, lookAround: 0.1, mouthStroke: 8.5 },
  wide: { eyeScale: 1.24, spring: 6.5, lookAround: 0.36, mouthStroke: 7 },
} satisfies Record<MascotEyes, { eyeScale: number; spring: number; lookAround: number; mouthStroke: number }>;

function MascotAccessoryLayer({
  kind,
  state,
  animated,
}: {
  kind: MascotAccessory;
  state: MausState;
  animated: boolean;
}) {
  if (kind === "none") return null;
  const lively = ["working", "searching", "excited", "happy", "playful", "celebrate"].includes(state);
  const className = `pointer-events-none absolute inset-0 ${animated ? (lively ? "mascot-accessory-busy" : "mascot-accessory-idle") : ""}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      {kind === "leaf" && (
        <g transform="rotate(-14 66 19)">
          <path d="M54 25 C58 7 78 5 82 12 C84 22 71 31 55 30 Z" fill="#ff8a5b" stroke="#21182f" strokeWidth="2.5" />
          <path d="M58 27 C65 20 71 15 78 12" fill="none" stroke="#21182f" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {kind === "headphones" && (
        <g fill="none" stroke="#fff7df" strokeWidth="5" strokeLinecap="round">
          <path d="M19 52 C19 17 81 17 81 52" />
          <rect x="13" y="48" width="14" height="29" rx="7" fill="#ff8a5b" stroke="#21182f" strokeWidth="3" />
          <rect x="73" y="48" width="14" height="29" rx="7" fill="#ff8a5b" stroke="#21182f" strokeWidth="3" />
        </g>
      )}
      {kind === "crown" && (
        <path d="M28 31 L24 11 L41 22 L50 7 L59 22 L77 11 L73 34 Z" fill="#ffb75d" stroke="#21182f" strokeWidth="2.5" strokeLinejoin="round" />
      )}
      {kind === "beanie" && (
        <g>
          <path d="M24 39 C24 10 76 7 78 39 Z" fill="#ff8a5b" stroke="#21182f" strokeWidth="2.5" />
          <rect x="20" y="36" width="61" height="12" rx="6" fill="#fff7df" stroke="#21182f" strokeWidth="2.5" />
          <circle cx="51" cy="10" r="7" fill="#fff7df" stroke="#21182f" strokeWidth="2.5" />
        </g>
      )}
      {kind === "glasses" && (
        <g fill="none" stroke="#21182f" strokeWidth="3.2">
          <circle cx="34" cy="53" r="14" fill="#fff7df" fillOpacity="0.12" />
          <circle cx="67" cy="53" r="14" fill="#fff7df" fillOpacity="0.12" />
          <path d="M48 52 H53 M20 49 L10 45 M81 49 L91 45" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/**
 * Legacy face-placement knobs from the Maus body era. The cursor mascot
 * places its own face; these remain only so the preview harness's sliders
 * keep compiling — the matching props are accepted and ignored.
 */
export const FACE_X = 80;
export const FACE_Y = 102;
export const FACE_SCALE = 0.47;
export const EYE_SCALE = 1.12;
export const MOUTH_WEIGHT = 11;

/**
 * How far the pointer may pull the eyes. Facing forward the full range is
 * safe; with the expressions' authored gaze they already start off-centre.
 */
const POINTER_GAZE = { forward: 1, authored: 0.25 };

/**
 * What a one-shot motion does while it plays: CursorAvatar animates the body
 * per state, so borrowing the state for a beat moves body and face together.
 */
interface MotionFaces
  extends Partial<
    Record<Exclude<MausMotion, "none">, { state?: MausState; blink?: boolean; spin?: number }>
  > {}

const MOTION_FACE: MotionFaces = {
  arrive: { state: "spawning", spin: 900 },
  switch: { state: "waking", spin: 620 },
  customize: { state: "proud", blink: true },
  alert: { state: "alerting" },
  thinking: { state: "thinking" },
  working: { state: "working" },
  launch: { state: "loading" },
  success: { state: "happy", blink: true },
  celebrate: { state: "celebrate", spin: 700 },
  blink: { blink: true },
  surprise: { state: "surprised", blink: true },
  failure: { state: "sad" },
};

/** How long a one-shot motion holds its state before the bot's own returns. */
const MOTION_FACE_MS = 1400;

/** Channel-wise mix of a hex color toward another, t in 0..1. */
function mix(hex: string, toward: string, t: number): string {
  const a = Number.parseInt(hex.slice(1), 16);
  const b = Number.parseInt(toward.slice(1), 16);
  const channel = (shift: number) => {
    const va = (a >> shift) & 0xff;
    const vb = (b >> shift) & 0xff;
    return Math.round(va + (vb - va) * t);
  };
  return `#${[channel(16), channel(8), channel(0)]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Bot color -> the mascot's three-stop body gradient (highlight, base,
 * shadow), with the same light/dark spread as the pack's default green
 * ["#9FE6B5", "#3FAE6E", "#1C7A4C"].
 */
const gradientFor = (color: MausColor): [string, string, string] => {
  const fill = MAUS_COLORS[color] ?? MAUS_COLORS.green;
  return [mix(fill, "#ffffff", 0.55), fill, mix(fill, "#000000", 0.42)];
};

export type MausAvatarHandle = CursorAvatarHandle;

export type MausAvatarProps = {
  color: MausColor;
  /** Creature body, eye proportions, and wearable are independently saved. */
  body?: MascotBody | string | null;
  eyes?: MascotEyes | string | null;
  accessory?: MascotAccessory | string | null;
  /** Named behaviour — drives the expression pool, its cadence and blinking. */
  state?: MausState;
  /** Pin one of the 25 faces and stop the state's own drift. */
  expression?: number;
  size?: number;
  label?: string;
  motion?: MausMotion;
  motionKey?: number;
  /** Head turn in degrees. */
  turn?: number;
  gaze?: { x?: number; y?: number };
  spring?: number;
  eyeScale?: number;
  showMouth?: boolean;
  mouthStroke?: number;
  /**
   * Face the viewer at turn 0, cancelling each expression's authored gaze
   * direction. Off restores the engine's own drawn-in directions.
   */
  forward?: boolean;
  /** How much each expression glances around. Overrides `forward`'s 0-or-1. */
  lookAround?: number;
  /** Let the eyes follow the pointer across this avatar. */
  trackPointer?: boolean;
  /** Run the animation. Off renders the state's resting face. */
  animated?: boolean;
  /** Legacy Maus face-placement knobs — accepted, ignored. */
  eyeSpacing?: number;
  faceX?: number;
  faceY?: number;
  faceScale?: number;
};

function MausAvatarComponent(
  {
    color,
    body,
    eyes,
    accessory,
    state = "idle",
    expression,
    size = 44,
    label,
    motion = "none",
    motionKey = 0,
    turn,
    gaze,
    spring,
    eyeScale,
    showMouth,
    mouthStroke,
    forward = true,
    lookAround,
    trackPointer = true,
    animated = true,
  }: MausAvatarProps,
  ref: React.Ref<MausAvatarHandle>,
) {
  const inner = useRef<CursorAvatarHandle>(null);
  useImperativeHandle(ref, () => ({
    blink: () => inner.current?.blink(),
    spin: (durationMs?: number) => inner.current?.spin(durationMs),
    setExpression: (index: number) => inner.current?.setExpression(index),
  }));

  // A one-shot motion borrows the state for a moment, then hands it back.
  const [motionState, setMotionState] = useState<MausState | null>(null);
  useEffect(() => {
    if (motion === "none" || !animated) return;
    const beat = MOTION_FACE[motion];
    if (!beat) return;
    if (beat.blink) inner.current?.blink();
    if (beat.spin) inner.current?.spin(beat.spin);
    if (!beat.state) return;
    setMotionState(beat.state);
    const timer = setTimeout(() => setMotionState(null), MOTION_FACE_MS);
    return () => clearTimeout(timer);
  }, [motion, motionKey, animated]);

  // Pointer-follow gaze, composed with any gaze the caller pins.
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const range = forward ? POINTER_GAZE.forward : POINTER_GAZE.authored;
  const selectedEyes = EYE_STYLE[mascotEyes(eyes)];
  const selectedBody = MASCOT_SILHOUETTES[mascotBody(body)] ?? GRADIENT_SILHOUETTE;
  const onPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!trackPointer || !animated) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1)) * range,
      y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1)) * range,
    });
  };
  const onPointerLeave = () => setPointer({ x: 0, y: 0 });

  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
      onPointerMove={trackPointer && animated ? onPointerMove : undefined}
      onPointerLeave={trackPointer && animated ? onPointerLeave : undefined}
    >
      <CursorAvatar
        ref={inner}
        state={motionState ?? state}
        expression={expression}
        size={size}
        silhouette={selectedBody}
        gradient={gradientFor(color)}
        title={label ?? null}
        lookAround={lookAround ?? (forward ? selectedEyes.lookAround : 1)}
        gaze={{ x: (gaze?.x ?? 0) + pointer.x, y: (gaze?.y ?? 0) + pointer.y }}
        turn={turn}
        spring={spring ?? selectedEyes.spring}
        eyeScale={eyeScale ?? selectedEyes.eyeScale}
        showMouth={showMouth}
        mouthStroke={mouthStroke ?? selectedEyes.mouthStroke}
        paused={!animated}
      />
      <MascotAccessoryLayer
        kind={mascotAccessory(accessory)}
        state={motionState ?? state}
        animated={animated}
      />
    </span>
  );
}

export const MausAvatar = memo(forwardRef(MausAvatarComponent));

export type BotAvatarProps = Omit<MausAvatarProps, "color"> & {
  bot: {
    name?: string;
    color: MausColor;
    mascotBody?: MascotBody | string | null;
    mascotEyes?: MascotEyes | string | null;
    mascotAccessory?: MascotAccessory | string | null;
    avatarUrl?: string | null;
    avatarCrop?: BotAvatarCrop;
  };
};

/**
 * The one renderer for a bot's chosen profile image. Malformed persisted
 * values and images that fail to load both fall back to the animated mascot,
 * so an old/corrupt profile can never leave a broken-image icon in the app.
 */
export function BotAvatar({ bot, size = 44, label, ...mascotProps }: BotAvatarProps) {
  const profile = botAvatarProfile(bot);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [profile.avatarUrl]);

  if (profile.avatarCrop === "mascot" || !profile.avatarUrl || imageFailed) {
    return (
      <MausAvatar
        {...mascotProps}
        color={bot.color}
        body={bot.mascotBody}
        eyes={bot.mascotEyes}
        accessory={bot.mascotAccessory}
        size={size}
        label={label ?? bot.name}
      />
    );
  }

  const radius =
    profile.avatarCrop === "circle"
      ? "50%"
      : profile.avatarCrop === "rounded"
        ? "22%"
        : "0";
  return (
    <img
      src={profile.avatarUrl}
      alt={label ?? (bot.name ? `${bot.name} avatar` : "Bot avatar")}
      width={size}
      height={size}
      draggable={false}
      onError={() => setImageFailed(true)}
      className="block shrink-0 bg-raised object-cover"
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
}

export function InitialsAvatar({
  initials,
  size = 32,
}: {
  initials: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-raised text-ink-secondary font-medium"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}
