import { useMemo, useState } from "react";
import { Check, Code2, Compass, Crown, Loader2, Palette, Sparkles } from "lucide-react";

import type { Bot } from "@/state/store";
import { cn } from "@/lib/cn";
import {
  MAUS_COLORS,
  MAUS_COLOR_NAMES,
  PICKABLE_STATES,
  normalizeState,
  type MausColor,
  type MausState,
} from "@/lib/mascot";
import { BOT_PROFILE_LIMITS } from "../../shared/bot-profile";
import {
  MASCOT_ACCESSORY_NAMES,
  MASCOT_BODY_NAMES,
  MASCOT_EYE_NAMES,
  mascotAccessory,
  mascotBody,
  mascotEyes,
  type MascotAccessory,
  type MascotBody,
  type MascotEyes,
} from "../../shared/mascot-profile";
import { MausAvatar } from "./Avatar";

export interface CharacterDraft {
  name: string;
  title: string;
  description: string;
  color: MausColor;
  mascotExpression: MausState;
  mascotBody: MascotBody;
  mascotEyes: MascotEyes;
  mascotAccessory: MascotAccessory;
}

interface CharacterPreset extends CharacterDraft {
  id: string;
  label: string;
  note: string;
  Icon: typeof Code2;
}

const BODY_LABEL = {
  bean: "Bean",
  sprout: "Sprout",
  drop: "Drop",
  flop: "Flop",
  puff: "Puff",
  bolt: "Bolt",
} satisfies Record<MascotBody, string>;

const EYE_LABEL = {
  bright: "Bright",
  soft: "Soft",
  focused: "Focused",
  wide: "Wide",
} satisfies Record<MascotEyes, string>;

const ACCESSORY_LABEL = {
  none: "None",
  leaf: "Leaf",
  headphones: "Headphones",
  crown: "Crown",
  beanie: "Beanie",
  glasses: "Glasses",
} satisfies Record<MascotAccessory, string>;

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "builder",
    label: "Builder",
    note: "Makes, fixes, and explains",
    Icon: Code2,
    name: "Pixel",
    title: "Practical building partner",
    description:
      "Be upbeat, direct, and inventive. Turn fuzzy ideas into concrete plans, build carefully, explain important tradeoffs in plain language, and ask before taking risky actions.",
    color: "cyan",
    mascotExpression: "working",
    mascotBody: "bolt",
    mascotEyes: "focused",
    mascotAccessory: "headphones",
  },
  {
    id: "scout",
    label: "Scout",
    note: "Finds signal in the noise",
    Icon: Compass,
    name: "Scout",
    title: "Curious research guide",
    description:
      "Be curious, skeptical, and clear. Investigate from several angles, separate facts from guesses, cite sources when possible, and finish with the most useful next move.",
    color: "teal",
    mascotExpression: "curious",
    mascotBody: "sprout",
    mascotEyes: "bright",
    mascotAccessory: "glasses",
  },
  {
    id: "creative",
    label: "Creative",
    note: "Ideas with taste and personality",
    Icon: Palette,
    name: "Nova",
    title: "Playful creative partner",
    description:
      "Be imaginative, warm, and opinionated without being pushy. Offer distinctive ideas, avoid generic filler, notice visual and emotional details, and help turn the strongest idea into something real.",
    color: "coral",
    mascotExpression: "happy",
    mascotBody: "puff",
    mascotEyes: "wide",
    mascotAccessory: "beanie",
  },
  {
    id: "captain",
    label: "Captain",
    note: "Coordinates a whole crew",
    Icon: Crown,
    name: "Atlas",
    title: "Calm project captain",
    description:
      "Be organized, calm, and decisive. Break projects into owned outcomes, delegate when a specialist would help, keep everyone aligned, surface blockers early, and combine the work into one clear result.",
    color: "purple",
    mascotExpression: "proud",
    mascotBody: "bean",
    mascotEyes: "soft",
    mascotAccessory: "crown",
  },
];

export const characterDraftFromBot = (bot: Bot): CharacterDraft => ({
  name: bot.name || "Pixel",
  title: bot.title || "Practical building partner",
  description:
    bot.description ||
    "Be upbeat, direct, and inventive. Turn ideas into concrete plans and ask before taking risky actions.",
  color: bot.color,
  mascotExpression: normalizeState(bot.mascotExpression) ?? "happy",
  mascotBody: mascotBody(bot.mascotBody),
  mascotEyes: mascotEyes(bot.mascotEyes),
  mascotAccessory: mascotAccessory(bot.mascotAccessory),
});

export function CharacterSetupStep({
  bot,
  onBack,
  onSave,
}: {
  bot: Bot;
  onBack: () => void;
  onSave: (draft: CharacterDraft) => Promise<void>;
}) {
  const initial = useMemo(() => characterDraftFromBot(bot), [bot.id]);
  const [draft, setDraft] = useState<CharacterDraft>(initial);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const valid = draft.name.trim().length > 0 && draft.title.trim().length > 0 && draft.description.trim().length > 0;

  const choosePreset = (preset: CharacterPreset) => {
    setError("");
    setSelectedPreset(preset.id);
    setDraft({
      name: preset.name,
      title: preset.title,
      description: preset.description,
      color: preset.color,
      mascotExpression: preset.mascotExpression,
      mascotBody: preset.mascotBody,
      mascotEyes: preset.mascotEyes,
      mascotAccessory: preset.mascotAccessory,
    });
  };

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        title: draft.title.trim(),
        description: draft.description.trim(),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Pip could not save this character.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="character-setup-title" className="min-h-0 flex-1 overflow-y-auto pr-1 md:overflow-hidden md:pr-0">
      <div className="grid min-h-0 gap-6 md:h-full md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-[22px] bg-inset p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative flex h-full min-h-[250px] flex-col items-center justify-center text-center">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-secondary">Live character</div>
            <MausAvatar
              color={draft.color}
              state={draft.mascotExpression}
              body={draft.mascotBody}
              eyes={draft.mascotEyes}
              accessory={draft.mascotAccessory}
              size={118}
              motion="customize"
              motionKey={
                MASCOT_BODY_NAMES.indexOf(draft.mascotBody) * 1000 +
                MASCOT_EYE_NAMES.indexOf(draft.mascotEyes) * 100 +
                MASCOT_ACCESSORY_NAMES.indexOf(draft.mascotAccessory) * 10 +
                PICKABLE_STATES.indexOf(draft.mascotExpression)
              }
            />
            <div className="mt-4 max-w-full truncate text-[22px] font-semibold tracking-[-0.035em] text-ink">{draft.name || "Your agent"}</div>
            <div className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-secondary">{draft.title || "Give them a role"}</div>
            <div className="mt-5 rounded-xl bg-card/70 px-3 py-2 text-[11px] leading-relaxed text-ink-secondary">
              You can add a custom image and voice later from the agent profile.
            </div>
          </div>
        </div>

        <div className="min-h-0 md:overflow-y-auto md:pr-1 md:[scrollbar-width:thin]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
              <Sparkles size={17} />
            </span>
            <div>
              <h1 id="character-setup-title" className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Build your first character</h1>
              <p className="mt-1 max-w-[54ch] text-[13px] leading-relaxed text-ink-secondary">
                Pick a starting vibe, then make it yours. These words become the agent&rsquo;s working personality—not just profile decoration.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {CHARACTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selectedPreset === preset.id}
                onClick={() => choosePreset(preset)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl bg-card p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-control active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  selectedPreset === preset.id && "ring-2 ring-accent-border",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-inset text-ink-secondary transition-colors group-hover:text-ink">
                  <preset.Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{preset.label}</span>
                  <span className="block truncate text-[11px] text-ink-secondary">{preset.note}</span>
                </span>
                {selectedPreset === preset.id && <Check size={14} className="ml-auto shrink-0 text-accent-text" />}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-ink-secondary">Name</span>
              <input
                value={draft.name}
                maxLength={BOT_PROFILE_LIMITS.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-hairline/40 bg-inset px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-secondary focus:border-accent-border focus:outline-none"
                placeholder="Pixel"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-ink-secondary">Role</span>
              <input
                value={draft.title}
                maxLength={BOT_PROFILE_LIMITS.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-hairline/40 bg-inset px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-secondary focus:border-accent-border focus:outline-none"
                placeholder="Research guide"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-ink-secondary">
              <span>Personality &amp; working instructions</span>
              <span className="tabular-nums">{draft.description.length}/{BOT_PROFILE_LIMITS.description}</span>
            </span>
            <textarea
              value={draft.description}
              maxLength={BOT_PROFILE_LIMITS.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="min-h-[104px] w-full resize-none rounded-xl border border-hairline/40 bg-inset px-3 py-2.5 text-[13px] leading-relaxed text-ink placeholder:text-ink-secondary focus:border-accent-border focus:outline-none"
              placeholder="How should this agent think, speak, and work?"
            />
          </label>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div className="text-[11.5px] text-ink-secondary">Body</div>
              <div className="text-[10.5px] text-ink-secondary">Six creatures, one family</div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {MASCOT_BODY_NAMES.map((body) => (
                <button
                  key={body}
                  type="button"
                  aria-label={`Use ${BODY_LABEL[body]} body`}
                  aria-pressed={draft.mascotBody === body}
                  onClick={() => setDraft((current) => ({ ...current, mascotBody: body }))}
                  className={cn(
                    "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-inset px-1 py-2 text-[10.5px] text-ink-secondary transition hover:-translate-y-0.5 hover:bg-control hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    draft.mascotBody === body && "text-ink ring-2 ring-accent-border",
                  )}
                >
                  <MausAvatar color={draft.color} body={body} eyes="bright" accessory="none" state="happy" size={38} animated={false} />
                  {BODY_LABEL[body]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <div className="mb-2 text-[11.5px] text-ink-secondary">Eyes</div>
              <div className="grid grid-cols-4 gap-2">
                {MASCOT_EYE_NAMES.map((eyes) => (
                  <button
                    key={eyes}
                    type="button"
                    title={EYE_LABEL[eyes]}
                    aria-label={`Use ${EYE_LABEL[eyes]} eyes`}
                    aria-pressed={draft.mascotEyes === eyes}
                    onClick={() => setDraft((current) => ({ ...current, mascotEyes: eyes }))}
                    className={cn(
                      "flex min-h-[62px] flex-col items-center justify-center gap-0.5 rounded-xl bg-inset p-1 text-[9.5px] text-ink-secondary transition hover:bg-control hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      draft.mascotEyes === eyes && "text-ink ring-2 ring-accent-border",
                    )}
                  >
                    <MausAvatar color={draft.color} body={draft.mascotBody} eyes={eyes} accessory="none" state="idle" size={34} animated={false} />
                    {EYE_LABEL[eyes]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11.5px] text-ink-secondary">Accessory</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {MASCOT_ACCESSORY_NAMES.map((accessory) => (
                  <button
                    key={accessory}
                    type="button"
                    title={ACCESSORY_LABEL[accessory]}
                    aria-label={`Use ${ACCESSORY_LABEL[accessory]} accessory`}
                    aria-pressed={draft.mascotAccessory === accessory}
                    onClick={() => setDraft((current) => ({ ...current, mascotAccessory: accessory }))}
                    className={cn(
                      "flex min-h-[62px] flex-col items-center justify-center gap-0.5 rounded-xl bg-inset p-1 text-[9.5px] text-ink-secondary transition hover:bg-control hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      draft.mascotAccessory === accessory && "text-ink ring-2 ring-accent-border",
                    )}
                  >
                    <MausAvatar color={draft.color} body={draft.mascotBody} eyes={draft.mascotEyes} accessory={accessory} state="happy" size={34} animated={false} />
                    <span className="max-w-full truncate">{ACCESSORY_LABEL[accessory]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div>
              <div className="mb-2 text-[11.5px] text-ink-secondary">Color</div>
              <div className="flex flex-wrap gap-2">
                {MAUS_COLOR_NAMES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use ${color}`}
                    aria-pressed={draft.color === color}
                    onClick={() => setDraft((current) => ({ ...current, color }))}
                    className={cn(
                      "size-7 rounded-full border-2 border-transparent transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      draft.color === color && "ring-2 ring-accent-border ring-offset-2 ring-offset-panel",
                    )}
                    style={{ backgroundColor: MAUS_COLORS[color] }}
                  />
                ))}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 text-[11.5px] text-ink-secondary">Expression</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {PICKABLE_STATES.slice(0, 6).map((expression) => (
                  <button
                    key={expression}
                    type="button"
                    title={expression}
                    aria-label={`Use ${expression} expression`}
                    aria-pressed={draft.mascotExpression === expression}
                    onClick={() => setDraft((current) => ({ ...current, mascotExpression: expression }))}
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg bg-inset transition-colors hover:bg-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      draft.mascotExpression === expression && "ring-2 ring-accent-border",
                    )}
                  >
                    <MausAvatar
                      color={draft.color}
                      body={draft.mascotBody}
                      eyes={draft.mascotEyes}
                      accessory={draft.mascotAccessory}
                      state={expression}
                      size={28}
                      animated={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div>}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" onClick={onBack} className="rounded-lg px-3 py-2 text-[12.5px] text-ink-secondary hover:bg-control hover:text-ink">
              Back
            </button>
            <button
              type="button"
              disabled={!valid || saving}
              onClick={() => void save()}
              className="flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {saving ? "Saving character…" : `Meet ${draft.name.trim() || "your agent"}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
