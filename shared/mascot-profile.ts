export const MASCOT_BODY_NAMES = ["bean", "sprout", "drop", "flop", "puff", "bolt"] as const;
export type MascotBody = (typeof MASCOT_BODY_NAMES)[number];

export const MASCOT_EYE_NAMES = ["bright", "soft", "focused", "wide"] as const;
export type MascotEyes = (typeof MASCOT_EYE_NAMES)[number];

export const MASCOT_ACCESSORY_NAMES = ["none", "leaf", "headphones", "crown", "beanie", "glasses"] as const;
export type MascotAccessory = (typeof MASCOT_ACCESSORY_NAMES)[number];

export const mascotBody = (value: string | null | undefined): MascotBody =>
  MASCOT_BODY_NAMES.find((candidate) => candidate === value) ?? "bean";

export const mascotEyes = (value: string | null | undefined): MascotEyes =>
  MASCOT_EYE_NAMES.find((candidate) => candidate === value) ?? "bright";

export const mascotAccessory = (value: string | null | undefined): MascotAccessory =>
  MASCOT_ACCESSORY_NAMES.find((candidate) => candidate === value) ?? "none";
