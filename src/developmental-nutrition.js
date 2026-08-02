const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / Math.max(.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export function dependencyProgress(animal = {}, species = {}) {
  if (animal.lifeStage !== "dependent") return 1;
  return clamp((animal.age || 0) / Math.max(1, species.dependency || 1));
}

export function developmentalFeedingProfile(animal = {}, species = {}) {
  const progress = dependencyProgress(animal, species);
  const carnivore = animal.speciesId === "hunter";
  const solidsBegin = carnivore ? .3 : .16;
  const milkDecline = carnivore ? .48 : .38;
  const solidReadiness = smoothstep(solidsBegin, .9, progress);
  const milkReliance = animal.lifeStage === "dependent" ? 1 - smoothstep(milkDecline, 1, progress) : 0;
  return {
    progress,
    milkReliance,
    solidReadiness,
    phase: milkReliance > .78 ? "milk-dependent" : milkReliance > .25 ? "mixed-weaning" : milkReliance > 0 ? "late-weaning" : "solid-food"
  };
}

export function coatLifeProgress(animal = {}, species = {}) {
  if (animal.lifeStage === "dependent") return { transition: "newborn", amount: smoothstep(0, .82, dependencyProgress(animal, species)) };
  if (animal.lifeStage === "old") return { transition: "old", amount: smoothstep(species.oldAge || 1, species.maxAge || (species.oldAge || 1) + 1, animal.age || 0) };
  return { transition: "species", amount: 1 };
}
