export function reproductionReadiness(animal, species, { dependentNeedsCare = false } = {}) {
  const reasons = [];
  if (animal.sex === "F") {
    if (animal.energy <= species.reproductionEnergy) reasons.push("low-energy");
    if (animal.stomach < 48) reasons.push("low-food-reserve");
    if (animal.hydration < 58) reasons.push("low-hydration");
    if (animal.health < 68) reasons.push("poor-health");
    if (animal.fatigue > 62) reasons.push("high-fatigue");
    if (animal.fertilityImpaired) reasons.push("lasting-low-fat-fertility-impairment");
    if (Number.isFinite(animal.bodyFatPercent) && animal.bodyFatPercent < (species.femaleCriticalFat || 12)) reasons.push("insufficient-body-fat");
    if (dependentNeedsCare) reasons.push("dependent-needs-care");
  }
  return { ready: reasons.length === 0, reasons };
}

export function rankCandidatesWithCommitment(candidates, shortTerm, tick, bonus = 36) {
  const emergency = candidates.some((candidate) => candidate.urgent);
  return candidates.map((candidate) => ({
    ...candidate,
    score: candidate.score + (!emergency && shortTerm?.key === candidate.drive && shortTerm.untilTick > tick ? bonus : 0),
  })).sort((a, b) => b.score - a.score);
}

function topUnique(primary, alternatives, tick, horizon) {
  const seen = new Set(), ranked = [primary, ...alternatives].filter((goal) => goal?.key && !seen.has(goal.key) && seen.add(goal.key)).sort((left, right) => right.score - left.score || left.key.localeCompare(right.key)).slice(0, 3);
  return ranked.map((goal, index) => ({ key: goal.key, score: Math.round(goal.score), rank: index + 1, reviewedTick: tick, horizon }));
}

export function createGoalPlan(animal, chosen, tick, { depleted = false, dependentNeedsCare = false, reproductionReady = true, informationNeed = false, conditionNeeds = {}, rankedCandidates = [] } = {}) {
  const duration = Math.max(1, chosen.commitTicks || 4);
  const reproductionEligible = !animal.lifeStage || ["adult", "old"].includes(animal.lifeStage);
  let mediumKey = depleted ? "restore-reserves" : "maintain-local-safety";
  let longKey = "survive-and-maintain-condition";
  if (animal.pregnant) { mediumKey = "sustain-pregnancy"; longKey = "raise-current-offspring"; }
  else if (dependentNeedsCare) { mediumKey = "care-for-dependent"; longKey = "raise-current-offspring"; }
  else if (reproductionEligible && animal.sex === "F" && !reproductionReady) { if (!depleted) mediumKey = "restore-before-reproduction"; longKey = "reproduce-when-resourced"; }
  else if (reproductionEligible && animal.sex === "F") longKey = "reproduce-when-resourced";
  if (informationNeed && !depleted && !animal.pregnant && !dependentNeedsCare) { mediumKey = "improve-local-awareness"; longKey = animal.speciesId === "hunter" ? "maintain-prey-knowledge" : "maintain-predator-awareness"; }
  if (!depleted && (conditionNeeds.muscleDeficit > .04 || conditionNeeds.enduranceDeficit > .1)) mediumKey = conditionNeeds.muscleDeficit >= conditionNeeds.enduranceDeficit ? "build-strength" : "build-endurance";
  const shortAlternatives = [...rankedCandidates.map((candidate) => ({ key: candidate.drive, score: candidate.score })), { key: "rest-and-recover", score: 10 }, { key: "scan-surroundings", score: 5 }];
  const mediumAlternatives = [
    { key: "restore-reserves", score: depleted ? 96 : 38 }, { key: "maintain-local-safety", score: 55 },
    { key: "improve-local-awareness", score: informationNeed ? 82 : 30 }, { key: "care-for-dependent", score: dependentNeedsCare ? 98 : 18 },
    { key: "sustain-pregnancy", score: animal.pregnant ? 99 : 12 }, ...(reproductionEligible ? [{ key: "restore-before-reproduction", score: animal.sex === "F" && !reproductionReady ? 78 : 16 }] : []),
    { key: "build-strength", score: (conditionNeeds.muscleDeficit || 0) * 120 }, { key: "build-endurance", score: (conditionNeeds.enduranceDeficit || 0) * 100 }
  ];
  const longAlternatives = [
    { key: "survive-and-maintain-condition", score: 92 }, { key: "raise-current-offspring", score: animal.pregnant || dependentNeedsCare ? 98 : 22 },
    ...(reproductionEligible ? [{ key: "reproduce-when-resourced", score: animal.sex === "F" ? 72 : 36 }] : []),
    { key: animal.speciesId === "hunter" ? "maintain-prey-knowledge" : "maintain-predator-awareness", score: informationNeed ? 80 : 48 },
    { key: "maintain-social-bonds", score: 34 }
  ];
  const shortRanking = topUnique({ key: chosen.drive, score: Number.isFinite(chosen.score) ? chosen.score : 100 }, shortAlternatives, tick, "short");
  const mediumRanking = topUnique({ key: mediumKey, score: 100 }, mediumAlternatives, tick, "medium");
  const longRanking = topUnique({ key: longKey, score: 100 }, longAlternatives, tick, "long");
  return {
    currentPriority: { key: shortRanking[0].key, startedTick: tick, untilTick: tick + duration },
    immediateConcern: { key: shortRanking[0].key, startedTick: tick, untilTick: tick + duration },
    supportingGoal: { key: mediumRanking[0].key, reviewedTick: tick },
    lifeStrategy: { key: longRanking[0].key, reviewedTick: tick },
    shortTerm: { key: shortRanking[0].key, startedTick: tick, untilTick: tick + duration },
    mediumTerm: { key: mediumRanking[0].key, reviewedTick: tick },
    longTerm: { key: longRanking[0].key, reviewedTick: tick },
    rankings: { immediateConcern: shortRanking, supportingGoal: mediumRanking, lifeStrategy: longRanking, shortTerm: shortRanking, mediumTerm: mediumRanking, longTerm: longRanking }
  };
}

export function migrateGoalPlan(animal, tick = 0) {
  const plan = animal.goalPlan || {};
  const immediate = plan.immediateConcern || plan.currentPriority || plan.shortTerm;
  const supporting = plan.supportingGoal || plan.mediumTerm;
  const strategy = plan.lifeStrategy || plan.longTerm;
  const immediateRanking = plan.rankings?.immediateConcern || plan.rankings?.shortTerm;
  const supportingRanking = plan.rankings?.supportingGoal || plan.rankings?.mediumTerm;
  const strategyRanking = plan.rankings?.lifeStrategy || plan.rankings?.longTerm;
  const rank = (goals, primary, horizon) => (goals || (primary?.key ? [{ key: primary.key, score: 100 }] : [])).slice(0, 3).map((goal, index) => ({ key: goal.key, score: Number(goal.score) || 0, rank: index + 1, reviewedTick: Number(goal.reviewedTick || tick), horizon }));
  const currentPriority = immediate?.key ? { key: immediate.key, startedTick: Number(immediate.startedTick || tick), untilTick: Number(immediate.untilTick || tick) } : null;
  const support = supporting?.key ? { key: supporting.key, reviewedTick: Number(supporting.reviewedTick || tick) } : null;
  const life = strategy?.key ? { key: strategy.key, reviewedTick: Number(strategy.reviewedTick || tick) } : null;
  animal.goalPlan = {
    currentPriority, immediateConcern: currentPriority, supportingGoal: support, lifeStrategy: life,
    shortTerm: currentPriority, mediumTerm: support, longTerm: life,
    rankings: {
      immediateConcern: rank(immediateRanking, immediate, "immediate"), supportingGoal: rank(supportingRanking, supporting, "supporting"), lifeStrategy: rank(strategyRanking, strategy, "life"),
      shortTerm: rank(immediateRanking, immediate, "immediate"), mediumTerm: rank(supportingRanking, supporting, "supporting"), longTerm: rank(strategyRanking, strategy, "life")
    }
  };
  return animal.goalPlan;
}
