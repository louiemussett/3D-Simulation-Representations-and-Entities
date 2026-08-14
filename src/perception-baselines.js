import { deterministicChecksum } from "./deterministic-benchmark.js";
import { sensoryPhenotype } from "./biological-phenotypes.js";
import { animalEyePosition } from "./animal-face-geometry.js";
import { evaluateVision } from "./vision-model.js";

export const PHASE_ZERO_BASELINE_VERSION = 1;
export const PHASE_ZERO_DETERMINISTIC_HASH = "2b49c409";

const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

export const FOUNDER_VISUAL_BASELINE = deepFreeze({
  grazer: { bodyScale: [.76, .45, .84], bodyY: .38, headScale: [.39, .36, .41], adultHeadPosition: [0, .43, .46], rightEye: animalEyePosition("grazer", 1) },
  hunter: { bodyScale: [.66, .34, 1.05], bodyY: .28, headScale: [.58, .72, .58], adultHeadPosition: [0, .3, .62], tailScale: [1.15, 1.35, 1.15], tailPosition: [0, .2, -.82], rightEye: animalEyePosition("hunter", 1) }
});

export function phaseZeroDeterministicSnapshot() {
  const viewer = { id: "VG-baseline", speciesId: "grazer", x: 0, z: 0, orientation: 0, headYaw: 0 };
  const target = { id: "RH-baseline", speciesId: "hunter", x: 4, z: 0 };
  return Object.freeze({
    version: PHASE_ZERO_BASELINE_VERSION,
    founders: FOUNDER_VISUAL_BASELINE,
    senses: Object.freeze({ grazer: sensoryPhenotype("grazer"), hunter: sensoryPhenotype("hunter") }),
    vision: evaluateVision(viewer, target, { range: 8, surfaceHeight: () => 0, coverOpacity: () => 0 })
  });
}

// Historical Phase 0 checksum remains immutable after later biological phases.
export function phaseZeroDeterministicHash() { return PHASE_ZERO_DETERMINISTIC_HASH; }
export function currentPerceptionDeterministicHash() { return deterministicChecksum(phaseZeroDeterministicSnapshot()); }
