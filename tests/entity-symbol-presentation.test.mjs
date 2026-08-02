import test from "node:test";
import assert from "node:assert/strict";
import { actionBadgePresentation, entityIdentityPresentation, lifeStageCode, publicSignalPresentation, simplifyAttachedSignal, thoughtPresentation, thoughtSignalAlignment, undecidedThoughtPresentation } from "../src/entity-symbol-presentation.js";

test("private thought is immediate and persistent only for the selected animal", () => {
  assert.deepEqual(thoughtPresentation({ selected: true }), { visible: true, persistent: true, transient: false });
  assert.equal(thoughtPresentation({ laboratory: true, transitionActive: true }).visible, false);
  assert.equal(thoughtPresentation({ laboratory: true, transitionActive: false }).visible, false);
  assert.equal(thoughtPresentation({ hovered: true, transitionActive: true }).visible, false);
  assert.equal(thoughtPresentation({ movieFeatured: true, transitionActive: true }).visible, false);
  assert.equal(thoughtPresentation({}).visible, false);
  assert.equal(thoughtPresentation({ selected: true, urgentImpact: true }).visible, false);
});

test("public signal presentation distinguishes calls and suppresses passive thermal duplicates", () => {
  assert.equal(publicSignalPresentation({ signal: { id: "heat" }, expressionKey: "hot" }).suppressedDuplicate, true);
  assert.equal(publicSignalPresentation({ signal: { id: "heat" }, expressionKey: "hot", vocalActive: true }).visible, true);
  assert.equal(publicSignalPresentation({ signal: { id: "threat" }, expressionKey: "fear" }).mode, "non-vocal outward display");
  assert.equal(publicSignalPresentation({ signal: { id: "threat" }, vocalActive: true }).mode, "vocal call");
});

test("simple need badges omit species while dependent signals retain it", () => {
  assert.equal(simplifyAttachedSignal({ id: "water" }).hideSpecies, true);
  assert.equal(simplifyAttachedSignal({ id: "dependent-care" }).hideSpecies, false);
});

test("ordinary movement and higher-priority cues suppress action medallions", () => {
  assert.match(actionBadgePresentation({ notable: false, dominant: "action" }).suppression, /arrows/);
  assert.equal(actionBadgePresentation({ notable: true, dominant: "signal" }).visible, false);
  assert.equal(actionBadgePresentation({ notable: true, dominant: "action" }).visible, true);
});

test("identity codes and thought-signal agreement are deterministic", () => {
  assert.deepEqual(["dependent", "juvenile", "subadult", "adult", "old"].map(lifeStageCode), ["B", "J", "YA", "A", "O"]);
  assert.equal(thoughtSignalAlignment("seek water", { id: "water" }).aligned, true);
  assert.equal(thoughtSignalAlignment("seek water", { id: "threat" }).aligned, false);
  assert.equal(thoughtSignalAlignment("seek water").compared, false);
});

test("the empty private-priority cue is explicitly undecided and never mutates cognition", () => {
  const animal = { speciesId: "grazer", lifeStage: "adult" };
  const cue = undecidedThoughtPresentation(animal);
  assert.equal(cue.placeholder, true);
  assert.equal(cue.semanticKey, "thought-empty:undecided");
  assert.equal(cue.grammar.object, "UNDECIDED");
  assert.equal(cue.meaning.glyph, "⋯");
  assert.match(cue.explanation, /No private priority has committed/);
  assert.deepEqual(animal, { speciesId: "grazer", lifeStage: "adult" });
});

test("entity identity presentation supplies a compact public constellation label", () => {
  assert.deepEqual(
    entityIdentityPresentation(
      { id: "VG12", sex: "F", lifeStage: "adult", pregnant: null },
      { observableExpressionGlyph: "🙂", publicCueGlyph: "⚠" }
    ),
    { fullId: "VG12", shortId: "VG12", sexGlyph: "♀", lifeStageCode: "A", pregnancyMarker: "", compactText: "[VG12 ♀ A 🙂 ⚠]" }
  );
  assert.deepEqual(
    entityIdentityPresentation({ id: "Valley-Grazer-128", sex: "male", lifeStage: "old", pregnant: true }),
    { fullId: "Valley-Grazer-128", shortId: "VG128", sexGlyph: "♂", lifeStageCode: "O", pregnancyMarker: "P", compactText: "[VG128 ♂ O P]" }
  );
});

test("entity identity presentation does not inspect or expose private animal state", () => {
  const entity = { id: "RH4", sex: "M", lifeStage: "subadult", pregnant: false };
  for (const key of ["priority", "memories", "physiology", "predictiveCycle"]) Object.defineProperty(entity, key, { get() { throw new Error(`private field read: ${key}`); } });
  const presentation = entityIdentityPresentation(entity);
  assert.equal(presentation.compactText, "[RH4 ♂ YA]");
  assert.equal(Object.isFrozen(presentation), true);
  assert.doesNotMatch(JSON.stringify(presentation), /priority|memories|physiology|predictive/i);
});
