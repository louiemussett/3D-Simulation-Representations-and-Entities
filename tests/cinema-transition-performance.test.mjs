import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("Cinema cuts stage camera admission and overlays across later frames", () => {
  assert.match(app, /function requestCinemaShotPresentationRefresh\(\)[\s\S]{0,300}cinemaPresentationRefreshStage = 1/);
  assert.match(app, /movieState\.presentationPending && transitionProgress >= 1[\s\S]{0,240}requestCinemaShotPresentationRefresh\(\)/);
  assert.match(app, /cinemaPresentationRefreshStage === 1[\s\S]{0,180}refreshCameraAdmission\(\)[\s\S]{0,180}cinemaPresentationRefreshStage = 2/);
  assert.match(app, /else \{[\s\S]{0,100}refreshCinemaShotOverlays\(\)[\s\S]{0,100}cinemaPresentationRefreshStage = 0/);
  assert.match(app, /function renderAllWork\(\{ cameraOnly = false, refreshOverlays = false \} = \{\}\)/);
  assert.match(app, /if \(!cameraOnly\) \{[\s\S]{0,700}updateKnowledgeFog/);
});

test("Cinema entry and camera recovery request the staged presentation refresh", () => {
  assert.match(app, /document\.body\.classList\.add\("movie-mode"\)[\s\S]{0,440}requestCinemaShotPresentationRefresh\(\)/);
  assert.match(app, /restoreCameraFadedVegetation\(\); requestCinemaShotPresentationRefresh\(\)/);
});

test("Cinema still queues bounded multi-shot coverage before the next cut", () => {
  assert.match(app, /const maximumShots = [\s\S]{0,500}\? 3/);
  assert.match(app, /movieState\.queue = planCinemaCommentary\(plannedBeats\)/);
});

test("Cinema preserves continuous hunt coverage instead of cutting on narration tempo", () => {
  assert.match(app, /Narration tempo must not become an editing tempo/);
  assert.match(app, /\["evidence", "approach", "pursuit"\]\.includes\(sceneCandidate\.interactionPhase\)[\s\S]{0,180}plannedDuration, 7/);
  assert.match(app, /sameThread && !decisiveThreadMoment[\s\S]{0,120}continuous-story-matched-blend/);
  assert.doesNotMatch(app, /cut-on-fast-thread-development/);
});

test("Cinema bounds expensive camera validation and ecological rescans", () => {
  assert.match(app, /function fullyValidatedMovieCandidates\(candidates, story, desired = 2\)/);
  assert.match(app, /bucket = Math\.floor\(tick \/ 12\)/);
  assert.match(app, /cinemaCellSnapshotCache\.bucket === bucket/);
  assert.match(app, /movieState\.lastEventScanTick === sim\?\.tick/);
  assert.match(app, /cinemaInteractionChainCache\.simulation === sim[\s\S]{0,180}cinemaInteractionChainCache\.tick === tick/);
  assert.match(app, /fullValidationDue = [\s\S]{0,220}lastFullCameraValidationAt >= 1250/);
  assert.match(app, /validateMovieCamera\(cameraCandidate, liveStory, \{ occlusion: "none", subjectLimit: 3 \}\)/);
  assert.match(app, /context === "cinema" && now - lastCinemaVegetationFadeAt < 100/);
  assert.match(app, /context === "cinema" \? movieVegetationOccluders\(scratch\.focus, scratch\.desired\) : \[groups\.plants\]/);
});
