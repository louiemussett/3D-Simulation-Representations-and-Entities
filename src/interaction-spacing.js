export const INTERACTION_GAPS = Object.freeze({ ordinary: .22, attack: 0, mating: 0, nursing: 0, feeding: 0, fighting: 0, sparring: 0, drinking: .16, guarding: .5, social: .25 });

export function bodyRadius(profileOrAnimal = {}) { return Math.max(.08, profileOrAnimal.bodyRadius ?? profileOrAnimal.collisionRadius ?? profileOrAnimal.locomotion?.collisionRadius ?? .28); }
export function collisionRadiusFor(animal = {}, baseRadius = .28) {
  const stageScale = ({ dependent: .48, juvenile: .68, subadult: .86, adult: 1, old: .96 })[animal.lifeStage] ?? 1;
  const traitScale = Math.sqrt(Math.max(.45, Number(animal.sizeTrait) || 1));
  return Math.max(.08, baseRadius * stageScale * traitScale);
}
export function contactSpan(a, b) { return bodyRadius(a) + bodyRadius(b); }
export function scaledContactRange(a, b, spans) { return contactSpan(a, b) * Math.max(0, spans); }
export function interactionRadius(actor, target = null, kind = "ordinary") {
  return bodyRadius(actor) + (target ? bodyRadius(target) : 0) + (INTERACTION_GAPS[kind] ?? INTERACTION_GAPS.ordinary);
}
export function edgeDistance(a, b) { return Math.max(0, Math.hypot(b.x - a.x, b.z - a.z) - bodyRadius(a) - bodyRadius(b)); }
export function physicalContact(actor, target, tolerance = .01) {
  if (!actor || !target || !Number.isFinite(actor.x) || !Number.isFinite(actor.z) || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return false;
  return Math.hypot(target.x - actor.x, target.z - actor.z) <= bodyRadius(actor) + bodyRadius(target) + Math.max(0, tolerance);
}

export function softSeparation(actor, neighbours, { contactTargetId = null, range = 1.8, weight = 1 } = {}) {
  let x = 0, z = 0;
  for (const other of neighbours || []) {
    if (!other || other.id === actor.id || other.id === contactTargetId) continue;
    const dx = actor.x - other.x, dz = actor.z - other.z, d = Math.hypot(dx, dz);
    const desired = bodyRadius(actor) + bodyRadius(other) + range;
    if (d < .0001 || d >= desired) continue;
    const strength = (1 - d / desired) ** 2 * weight;
    x += dx / d * strength; z += dz / d * strength;
  }
  return { x, z };
}

// Personal space remains behavioural, but bodies are a hard physical limit.
// Resolve a proposed centre position against every living animal, including an
// interaction target: mating, nursing and fighting require contact, never
// interpenetration. Locomotion substeps are shorter than the smallest pair's
// combined radius, so this positional projection also prevents tunnelling.
export function resolveAnimalBodyCollision(actor, proposed, neighbours, tolerance = .002) {
  let x = proposed.x, z = proposed.z, collided = false;
  const actorRadius = bodyRadius(actor);
  const ordered = [...(neighbours || [])].filter((other) => other?.alive !== false && other.id !== actor.id && Number.isFinite(other.x) && Number.isFinite(other.z)).sort((left, right) => String(left.id).localeCompare(String(right.id)));
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (const other of ordered) {
      const otherState = other.locomotion || other, minimum = actorRadius + bodyRadius(other) + Math.max(0, tolerance);
      let dx = x - otherState.x, dz = z - otherState.z, distance = Math.hypot(dx, dz);
      if (distance >= minimum) continue;
      if (distance < 1e-8) {
        // Stable, ID-derived direction separates coincident spawn positions
        // without introducing frame-order randomness.
        const seed = `${actor.id}|${other.id}`.split("").reduce((sum, character) => (sum * 33 + character.charCodeAt(0)) >>> 0, 5381);
        const angle = seed / 0xffffffff * Math.PI * 2; dx = Math.cos(angle); dz = Math.sin(angle); distance = 1;
      }
      x = otherState.x + dx / distance * minimum; z = otherState.z + dz / distance * minimum;
      collided = changed = true;
    }
    if (!changed) break;
  }
  return { ...proposed, x, z, collided };
}
