import { describe, expect, it } from "vitest";

import { CHARACTER_PRESETS, characterDraftFromBot } from "./CharacterSetupStep";

describe("character onboarding", () => {
  it("ships distinct, complete starting characters", () => {
    expect(CHARACTER_PRESETS).toHaveLength(4);
    expect(new Set(CHARACTER_PRESETS.map((preset) => preset.name)).size).toBe(4);
    expect(new Set(CHARACTER_PRESETS.map((preset) => preset.mascotBody)).size).toBe(4);
    expect(new Set(CHARACTER_PRESETS.map((preset) => preset.mascotAccessory)).size).toBe(4);
    for (const preset of CHARACTER_PRESETS) {
      expect(preset.title.length).toBeGreaterThan(8);
      expect(preset.description.length).toBeGreaterThan(80);
      expect(preset.description).toContain(".");
    }
  });

  it("preserves an existing bot character instead of overwriting it", () => {
    // SAFETY: characterDraftFromBot reads only the six supplied profile
    // fields; a complete runtime Bot fixture would obscure this unit test.
    const draft = characterDraftFromBot({
      id: "agent-1",
      name: "Mira",
      title: "Archive detective",
      description: "Treat every date as a clue.",
      color: "pink",
      mascotExpression: "suspicious",
      mascotBody: "flop",
      mascotEyes: "wide",
      mascotAccessory: "leaf",
    } as Parameters<typeof characterDraftFromBot>[0]);
    expect(draft).toEqual({
      name: "Mira",
      title: "Archive detective",
      description: "Treat every date as a clue.",
      color: "pink",
      mascotExpression: "suspicious",
      mascotBody: "flop",
      mascotEyes: "wide",
      mascotAccessory: "leaf",
    });
  });
});
