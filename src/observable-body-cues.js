import { activeEmittedSignal, visibleBodyCondition, visibleExpression } from "./visual-language.js";

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function visibleInjuryCue(animal = {}) {
  const injuries = animal.injuries || [];
  const strongest = injuries.reduce((value, injury) => Math.max(value, Number(injury.severity) || 0), 0);
  const impairment = Math.max(strongest, clamp((100 - (Number(animal.health) || 0)) / 100, 0, 1));
  if (impairment >= .65 || injuries.length >= 3) return "severe-impairment";
  if (impairment >= .35 || injuries.length >= 1) return "obvious-injury";
  if (impairment >= .15) return "minor-injury";
  return "none";
}

export function observableBodyCues(animal = {}, tick = animal.presentationTick || 0) {
  const injury = visibleInjuryCue(animal);
  const action = animal.actionState?.key || "idle";
  const activity = ["graze", "browse", "feed-carcass"].includes(action) ? "foraging" : ["guard", "nurse", "allow-nursing", "attend-birth"].includes(action) ? "care" : ["courtship", "accept-mate", "mating"].includes(action) ? "courtship" : ["attack", "defend", "flee", "chase", "social-attack", "intervene", "spar", "dominance"].includes(action) ? "urgent" : action === "submit" ? "submissive" : "ordinary";
  const headMovement = ["listen"].includes(action) ? "listening" : ["search", "guard", "evaluate-prey", "assess-rival"].includes(action) ? "scanning" : ["track-scent"].includes(action) ? "sniffing" : ["graze", "browse", "drink", "feed-carcass"].includes(action) ? "lowered" : "forward";
  const expression = visibleExpression(animal, tick), bodyCondition = visibleBodyCondition(animal);
  const pregnancyPhase = animal.pregnancyHormones?.phase;
  const reproductiveCondition = animal.sex === "F" && ["late pregnancy", "pre-labour"].includes(pregnancyPhase) ? "visibly-pregnant" : null;
  return Object.freeze({
    injury,
    gait: injury === "severe-impairment" ? "strong-limp" : injury === "obvious-injury" ? "limp" : "normal",
    moving: Boolean(animal.actionState?.moving),
    posture: animal.actionState?.moving ? "moving" : "stationary", activity, headMovement,
    movementPace: ["flee", "chase", "attack"].includes(action) ? "rapid" : animal.actionState?.moving ? "calm" : "still",
    sex: animal.sex || "unknown", lifeStage: animal.lifeStage || "unknown",
    apparentMass: Number(animal.bodyMass) || 0, apparentAge: Number(animal.age) || 0,
    aggressionDisplay: clamp(Number(animal.aggression) || .5, 0, 1),
    expression: expression.key, bodyCondition: bodyCondition.key, reproductiveCondition,
    emittedSignal: activeEmittedSignal(animal, tick)?.kind || null
  });
}
