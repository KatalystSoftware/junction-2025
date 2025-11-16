import { describe, expect, it } from "@jest/globals";
import {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-expect-error internal helper
  getSafeAverageDimensionScore,
} from "./orchestrator.ts";

describe("getSafeAverageDimensionScore", () => {
  it("falls back to qualityScore when dimensions are missing", () => {
    expect(getSafeAverageDimensionScore(7, undefined)).toBe(7);
  });

  it("uses average of all dimension scores when valid", () => {
    const avg = getSafeAverageDimensionScore(5, {
      adviceQuality: 8,
      communicationEffectiveness: 6,
      learningObjectives: 4,
      characterProgression: 6,
    });
    expect(avg).toBeCloseTo(6);
  });

  it("falls back to qualityScore when any dimension is non-numeric", () => {
    const avg = getSafeAverageDimensionScore(6.5, {
      adviceQuality: 8,
      // @ts-expect-error simulate bad data from model
      communicationEffectiveness: undefined,
      learningObjectives: 4,
      characterProgression: 6,
    });
    expect(avg).toBe(6.5);
  });
});
