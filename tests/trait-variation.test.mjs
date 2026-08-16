import test from "node:test";
import assert from "node:assert/strict";
import { applyOffspringTraitArchitecture, offspringTraitArchitecture } from "../src/trait-variation.js";

function sequence(values) { let index = 0; return () => values[index++ % values.length]; }

test("offspring variation exposes separate overall and divergence axes", () => {
  const profile = offspringTraitArchitecture({ mother: { aggression: .4, careAffinity: .8 }, father: { aggression: .6, careAffinity: .5 }, prenatalQuality: .8, random: sequence([.31, .73, .13, .89, .22, .77, .35, .65, .42, .58, .27, .81, .19, .69, .38, .62, .45, .55, .24, .76]) });
  assert.ok(Number.isFinite(profile.overallScore));
  assert.ok(profile.divergenceScore >= 0);
  assert.ok(["balanced", "specialised", "highly divergent"].includes(profile.profile));
  assert.notEqual(profile.values.waterSkill, profile.values.foodSkill);
});

test("difficult successful pregnancies widen possible trait divergence", () => {
  const values = [.41, .63, .08, .92, .2, .8, .3, .7, .36, .64, .25, .75, .15, .85, .45, .55, .33, .67, .28, .72];
  const healthy = offspringTraitArchitecture({ prenatalQuality: 1, random: sequence(values) });
  const difficult = offspringTraitArchitecture({ prenatalQuality: .1, random: sequence(values) });
  assert.ok(difficult.divergenceScore > healthy.divergenceScore);
});

test("trait architecture persists on the animal", () => {
  const animal = {};
  const architecture = offspringTraitArchitecture({ prenatalQuality: .7, random: sequence([.4, .6, .3, .7, .2, .8, .35, .65, .45, .55, .25, .75, .15, .85, .32, .68, .42, .58]) });
  applyOffspringTraitArchitecture(animal, architecture);
  assert.equal(animal.traitArchitecture.profile, architecture.profile);
  assert.equal(animal.memoryPersistence, architecture.values.memoryPersistence);
});
