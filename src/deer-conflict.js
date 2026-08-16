const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export function deerPredatorResponse(base = {}, context = {}) {
  const immediateContact = Boolean(context.immediateContact || context.attackInProgress);
  const exhausted = Boolean(context.exhausted);
  const cornered = Boolean(context.cornered || context.packEncirclement);
  const dependentUnderAttack = Boolean(context.dependentUnderAttack);
  const viableEscape = Boolean(context.viableEscape) && !cornered;
  let action = "watch", reason = "predator evidence remains below the escape threshold";
  if (viableEscape && !immediateContact && !dependentUnderAttack) { action = "flee"; reason = "a viable escape route remains safer than physical contact"; }
  else if (dependentUnderAttack && (immediateContact || context.distance <= 2.2)) { action = "defend"; reason = "a dependent is under direct attack at defensive-contact range"; }
  else if (immediateContact || cornered || exhausted && !viableEscape) { action = "defend"; reason = immediateContact ? "the predator has reached physical-contact range" : cornered ? "observed predator geometry leaves no viable escape route" : "exhaustion prevents a viable escape"; }
  else if (["flee", "withdraw"].includes(base.action)) { action = "flee"; reason = "threat assessment crossed the escape threshold"; }
  else if (base.action === "attack" || base.action === "mob") { action = viableEscape ? "flee" : "defend"; reason = viableEscape ? "counterattack was rejected because escape remains viable" : "defensive pressure is justified only because escape is not viable"; }
  return Object.freeze({ ...base, action, reason, conflictPurpose: "survival-defence", weapon: action === "defend" ? "front-hoof-or-kick" : null, pursueAfterRelease: false, releaseCondition: "safe escape route and predator beyond defensive-contact range", gates: Object.freeze({ viableEscape, immediateContact, exhausted, cornered, dependentUnderAttack }) });
}

export const RUT_PHASES = Object.freeze(["notice", "roar-assessment", "approach", "parallel-walk", "antler-lock", "resolved"]);

export function rutEligible(animal = {}, calendar = {}) {
  return animal.speciesId === "valley-grazer-updated" && animal.sex === "M" && ["adult", "old"].includes(animal.lifeStage) && calendar.season === "Autumn" && animal.antlers?.stage === "hard" && (animal.health || 0) >= 45 && (animal.energy || 0) >= 28;
}

export function createRutContest(actor, rival, tick = 0) {
  return { schemaVersion: 1, purpose: "mating-status", rivalId: rival.id, phase: "notice", startedTick: tick, phaseStartedTick: tick, resolvedTick: null, outcome: null, escalation: 0, assessmentConfidence: .2 };
}

export function advanceRutContest(actor, rival, context = {}) {
  const tick = Number(context.tick) || 0, state = actor.rutContest?.rivalId === rival.id ? actor.rutContest : createRutContest(actor, rival, tick);
  const elapsed = tick - state.phaseStartedTick, actorQuality = clamp((actor.bodyMass || 0) / Math.max(1, context.referenceMass || 160)) * .35 + clamp((100 - (actor.fatigue || 0)) / 100) * .2 + clamp(actor.antlers?.annual?.conditionInvestment || 0) * .25 + clamp(actor.aggression || 0) * .2;
  const rivalQuality = clamp(Number(context.observedRivalQuality) || .5), mismatch = actorQuality - rivalQuality;
  let phase = state.phase, outcome = null;
  if (phase === "notice" && elapsed >= 1) phase = "roar-assessment";
  else if (phase === "roar-assessment" && elapsed >= 2) { if (mismatch < -.24) { phase = "resolved"; outcome = "withdrew-after-assessment"; } else phase = "approach"; }
  else if (phase === "approach" && elapsed >= 2) phase = "parallel-walk";
  else if (phase === "parallel-walk" && elapsed >= 3) { if (Math.abs(mismatch) > .28) { phase = "resolved"; outcome = mismatch > 0 ? "rival-yielded" : "withdrew-after-parallel-walk"; } else phase = "antler-lock"; }
  else if (phase === "antler-lock" && elapsed >= 4) { phase = "resolved"; outcome = mismatch + (clamp(Number(context.observedRivalResistance) || .5) < .5 ? .08 : -.04) >= 0 ? "won-antler-contest" : "lost-antler-contest"; }
  if (phase !== state.phase) { state.phase = phase; state.phaseStartedTick = tick; }
  state.assessmentConfidence = clamp(state.assessmentConfidence + .12); state.escalation = RUT_PHASES.indexOf(phase); state.outcome = outcome || state.outcome;
  if (phase === "resolved") state.resolvedTick ??= tick;
  actor.rutContest = state;
  return state;
}
