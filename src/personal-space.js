const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const stableUnit = (value = "") => { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0) / 4294967295; };

export function migratePersonalSpace(animal = {}) {
  const seed = stableUnit(animal.id);
  animal.personalSpaceTrait = Number.isFinite(animal.personalSpaceTrait) ? clamp(animal.personalSpaceTrait, 0, 1) : clamp(seed * .72 + (Number(animal.aggression) || .5) * .28, 0, 1);
  animal.intrusionTolerance = Number.isFinite(animal.intrusionTolerance) ? clamp(animal.intrusionTolerance, 0, 1) : clamp(stableUnit(`${animal.id}:tolerance`) * .78 + (1 - (Number(animal.aggression) || .5)) * .22, 0, 1);
  return animal;
}

export function personalSpaceRadius(animal = {}, contactSpan = .5) {
  migratePersonalSpace(animal);
  const stage = ({ dependent: .42, juvenile: .5, subadult: .58, adult: .72, old: .82 })[animal.lifeStage] ?? .7;
  const temperament = .16 + animal.personalSpaceTrait * 1.28 + clamp(Number(animal.aggression) || .5, 0, 1) * .24;
  const vulnerability = clamp((100 - (Number(animal.health) || 100)) / 100 + (Number(animal.fear) || 0) / 180, 0, .8);
  return Math.max(contactSpan + .16, contactSpan + stage * temperament + vulnerability * .55);
}

export function assessPersonalSpace(actor = {}, target = {}, context = {}) {
  migratePersonalSpace(actor);
  const radius = personalSpaceRadius(actor, Number(context.contactSpan) || .5), distance = Number(context.distance);
  if (!target.alive || !Number.isFinite(distance) || distance > radius || actor.id === target.id) return null;
  const sameSpecies = actor.speciesId === target.speciesId, affinity = clamp(Number(context.affinity) || 0, -1, 1), grievance = clamp(Number(context.grievance) || 0, 0, 1);
  const intrusion = clamp(1 - Math.max(0, distance - (Number(context.contactSpan) || .5)) / Math.max(.1, radius - (Number(context.contactSpan) || .5)), 0, 1);
  const tolerance = actor.intrusionTolerance, aggression = clamp(Number(actor.aggression) || .5, 0, 1), fear = clamp(Number(actor.fear) || 0, 0, 100) / 100, allies = Math.max(0, Number(context.allies) || 0), roll = clamp(Number(context.roll) || 0, 0, .999999);
  if (!sameSpecies) {
    if (actor.speciesId === "grazer" && target.speciesId === "hunter") {
      if (allies >= 2 && aggression + (Number(actor.careAffinity) || .5) > 1.05 && fear < .72) return { kind: "rally-defence", pressure: intrusion + allies * .12, radius };
      return { kind: fear > .42 || intrusion > .65 ? "retreat" : "warn", pressure: intrusion + fear, radius };
    }
    return { kind: "orient", pressure: intrusion, radius, deferToPredation: true };
  }
  if (context.compatibleMate && affinity > -.25 && (Number(actor.libido) || 0) > .35) return { kind: "courtship", pressure: intrusion + (Number(actor.libido) || 0), radius };
  if (context.related || context.sameGroup || affinity >= .28) {
    if (affinity >= .48 || context.related) return { kind: roll < .7 ? "affiliate" : "ignore", pressure: intrusion + Math.max(0, affinity), radius };
    return { kind: roll < .55 ? "orient" : "ignore", pressure: intrusion, radius };
  }
  const hostility = aggression * .62 + grievance * .85 + intrusion * .35 + actor.personalSpaceTrait * .16 - tolerance * .52 - fear * .45;
  if (hostility > .94 && allies >= 2) return { kind: "rally-aggression", pressure: hostility + allies * .08, radius };
  if (hostility > .86) return { kind: "attack", pressure: hostility, radius };
  if (fear + (Number(actor.submissionTrait) || 0) * .45 > .72) return { kind: "retreat", pressure: fear + intrusion, radius };
  if (hostility > .58) return { kind: "warn", pressure: hostility, radius };
  return { kind: roll < .28 + tolerance * .5 ? "ignore" : "orient", pressure: intrusion, radius };
}
