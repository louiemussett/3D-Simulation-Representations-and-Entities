const finite = value => Number.isFinite(Number(value));

export const SURVIVAL_HANDOFF = Object.freeze({
  waterHydration: 32,
  foodStomach: 18,
  foodEnergy: 10,
  catastrophicHydration: 10,
  catastrophicStomach: 2,
  catastrophicEnergy: 3
});

const candidateNeed = candidate => candidate?.needId === "hydration" ? "water" : candidate?.needId === "nutrition" ? "food" : null;

export function survivalNeedRisk(animal = {}, need, candidate = {}) {
  if (need === "water") {
    const hydration = finite(animal.hydration) ? Number(animal.hydration) : 100;
    return Math.max(0, (18 - hydration) / 18) + (candidate.forecastState === "predicted-failure" ? .55 : 0);
  }
  const stomach = finite(animal.stomach) ? Number(animal.stomach) : 100, energy = finite(animal.energy) ? Number(animal.energy) : 100;
  return Math.max(0, (6 - stomach) / 6, (7 - energy) / 7);
}

export function survivalNeedCheckpointReached(animal = {}, need) {
  if (need === "water") return Number(animal.hydration || 0) >= SURVIVAL_HANDOFF.waterHydration;
  if (need === "food") return Number(animal.stomach || 0) >= SURVIVAL_HANDOFF.foodStomach && Number(animal.energy || 0) >= SURVIVAL_HANDOFF.foodEnergy;
  return true;
}

export function catastrophicSurvivalNeed(animal = {}, need) {
  if (need === "water") return Number(animal.hydration || 0) <= SURVIVAL_HANDOFF.catastrophicHydration;
  if (need === "food") return Number(animal.stomach || 0) <= SURVIVAL_HANDOFF.catastrophicStomach || Number(animal.energy || 0) <= SURVIVAL_HANDOFF.catastrophicEnergy;
  return false;
}

export function arbitrateSurvivalNeeds(animal = {}, candidates = [], tick = 0) {
  const available = candidates.filter(candidate => candidateNeed(candidate));
  if (!available.length) return null;
  if (available.length === 1) return Object.freeze({ selected: available[0], need: candidateNeed(available[0]), retained: false, reason: "only one physiological-failure need is active" });
  const incumbentNeed = animal.needDependencyPlan?.need || (animal.commitmentState?.episode?.needId === "hydration" ? "water" : animal.commitmentState?.episode?.needId === "nutrition" ? "food" : null);
  const incumbent = available.find(candidate => candidateNeed(candidate) === incumbentNeed), challenger = available.find(candidate => candidate !== incumbent);
  if (incumbent && !survivalNeedCheckpointReached(animal, incumbentNeed) && !catastrophicSurvivalNeed(animal, candidateNeed(challenger))) {
    return Object.freeze({ selected: incumbent, need: incumbentNeed, retained: true, reason: `${incumbentNeed} survival commitment retained until its safe handoff checkpoint` });
  }
  if (incumbent && catastrophicSurvivalNeed(animal, candidateNeed(challenger)) && !catastrophicSurvivalNeed(animal, incumbentNeed)) {
    return Object.freeze({ selected: challenger, need: candidateNeed(challenger), retained: false, reason: `${candidateNeed(challenger)} crossed its catastrophic interruption boundary` });
  }
  if (incumbent && survivalNeedCheckpointReached(animal, incumbentNeed) && challenger) {
    return Object.freeze({ selected: challenger, need: candidateNeed(challenger), retained: false, reason: `${incumbentNeed} reached its safe handoff checkpoint; ${candidateNeed(challenger)} remains in physiological failure` });
  }
  const ranked = available.slice().sort((left, right) => survivalNeedRisk(animal, candidateNeed(right), right) - survivalNeedRisk(animal, candidateNeed(left), left) || Number(right.score || 0) - Number(left.score || 0) || candidateNeed(left).localeCompare(candidateNeed(right)));
  const selected = ranked[0], need = candidateNeed(selected);
  return Object.freeze({ selected, need, retained: need === incumbentNeed, reason: incumbent && survivalNeedCheckpointReached(animal, incumbentNeed) ? `${incumbentNeed} reached its safe handoff checkpoint; ${need} now has greater physiological failure risk` : `${need} has the shortest estimated survival margin`, tick });
}
