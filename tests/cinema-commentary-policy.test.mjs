import assert from "node:assert/strict";
import { cinemaCommentaryDecision, cinemaCommentaryDevelopmentKey, cinemaCoverageShotCount, planCinemaCommentary } from "../src/cinema-commentary-policy.js";

const nursing = {
  kind: "interaction-stage",
  chainId: "care:VG1",
  chainSignature: "care:VG1:nursing:VG2",
  interactionPhase: "nursing",
  ids: ["VG1", "VG2"]
};

assert.equal(
  cinemaCommentaryDevelopmentKey({ ...nursing, chainStage: "dependent-state" }),
  cinemaCommentaryDevelopmentKey({ ...nursing, chainStage: "family-exchange" }),
  "different camera stages of the same nursing phase share one narration identity"
);
assert.notEqual(
  cinemaCommentaryDevelopmentKey({ ...nursing, chainSignature: "care:VG1:protection:VG2", interactionPhase: "protection" }),
  cinemaCommentaryDevelopmentKey(nursing),
  "a genuine interaction development may be narrated"
);

assert.deepEqual(planCinemaCommentary(["establish", "action", "reaction"]), [
  { beat: "establish", commentaryIntent: "commentary-eligible" },
  { beat: "action", commentaryIntent: "visual-only" },
  { beat: "reaction", commentaryIntent: "visual-only" }
]);

assert.deepEqual(cinemaCommentaryDecision({ narrationAvailable: true }), { narrate: true, reason: "new-development" });
assert.deepEqual(cinemaCommentaryDecision({ narrationAvailable: true, commentaryIntent: "visual-only" }), { narrate: false, reason: "visual-only-shot" });
assert.deepEqual(cinemaCommentaryDecision({ narrationAvailable: true, alreadyCovered: true }), { narrate: false, reason: "development-already-narrated" });

assert.deepEqual(
  [cinemaCoverageShotCount(3, { variation: .1 }), cinemaCoverageShotCount(3, { variation: .5 }), cinemaCoverageShotCount(3, { variation: .9 })],
  [1, 2, 3],
  "ordinary coverage varies between consecutive commentary opportunities and silent multi-angle sequences"
);
assert.deepEqual(
  [cinemaCoverageShotCount(3, { variation: .2, urgent: true }), cinemaCoverageShotCount(3, { variation: .9, urgent: true })],
  [1, 2],
  "urgent developments favour rapid hand-offs without banning a second visual angle"
);
assert.equal(cinemaCoverageShotCount(3, { variation: .1, preserveMaximum: true }), 3, "an authored opening may retain its complete establishing sequence");

const death = { id: "event:death:VG8:440", kind: "ecosystem-event", ids: ["VG8"], detectedTick: 440 };
assert.equal(cinemaCommentaryDevelopmentKey(death), cinemaCommentaryDevelopmentKey({ ...death, preferredBeat: "reaction" }), "camera treatment does not change event narration identity");

console.log("cinema commentary policy tests passed");
