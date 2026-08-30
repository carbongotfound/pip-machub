import { describe, expect, it } from "vitest";

import {
  MASCOT_ACCESSORY_NAMES,
  MASCOT_BODY_NAMES,
  MASCOT_EYE_NAMES,
  mascotAccessory,
  mascotBody,
  mascotEyes,
} from "./mascot-profile";

describe("mascot profile", () => {
  it("ships a useful combinatorial wardrobe", () => {
    expect(MASCOT_BODY_NAMES).toHaveLength(6);
    expect(MASCOT_EYE_NAMES).toHaveLength(4);
    expect(MASCOT_ACCESSORY_NAMES).toHaveLength(6);
    expect(MASCOT_BODY_NAMES.length * MASCOT_EYE_NAMES.length * MASCOT_ACCESSORY_NAMES.length).toBe(144);
  });

  it("falls back safely when old or corrupt records contain unknown values", () => {
    expect(mascotBody("unknown")).toBe("bean");
    expect(mascotEyes(null)).toBe("bright");
    expect(mascotAccessory(undefined)).toBe("none");
  });
});
