const clamp = (value, low, high) => Math.max(low, Math.min(high, Number(value) || 0));
const ACTION_FAMILIES = Object.freeze({
  "assess-rival": "assessment", dominance: "display", submit: "submission", spar: "contact-contest",
  "social-attack": "contact-conflict", intervene: "protective", defend: "protective", "protect-offspring": "protective",
  courtship: "affiliative", reject: "rejection", communicate: "communication", "coordinate-group": "communication",
  guard: "vigilance", "attend-birth": "care", "allow-nursing": "care", nurse: "care"
});

function hash32(value = "") { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
const unit = (value) => hash32(value) / 4294967295;

export function dynamicAnimationIdentity(animal = {}) {
  const key = `${animal.speciesId || "species"}:${animal.id || "animal"}`;
  return Object.freeze({
    schemaVersion: 1,
    variant: hash32(`${key}:variant`) % 32,
    tempo: .82 + unit(`${key}:tempo`) * .36,
    amplitude: .78 + unit(`${key}:amplitude`) * .38,
    lateralBias: unit(`${key}:side`) < .5 ? -1 : 1,
    phaseOffset: unit(`${key}:phase`) * Math.PI * 2
  });
}

export function interactionAnimationFamily(actionKey) { return ACTION_FAMILIES[actionKey] || null; }

export function pairedInteractionRole(animal = {}, partner = {}, actionKey = "idle") {
  const pairKey = [String(animal.id || ""), String(partner.id || "")].sort().join(":");
  const first = String(animal.id || "") <= String(partner.id || "");
  return Object.freeze({ pairKey: `${actionKey}:${pairKey}`, side: first ? -1 : 1, phaseOffset: first ? 0 : Math.PI, leader: first });
}

export function dynamicInteractionPose(animal = {}, context = {}) {
  const family = interactionAnimationFamily(context.actionKey || animal.actionState?.key);
  const zero = { active: false, family: null, variant: 0, body: { lift: 0, forward: 0, lateral: 0, pitch: 0, roll: 0, yaw: 0 }, head: { lift: 0, forward: 0, pitch: 0, roll: 0, yaw: 0 }, tail: { pitch: 0, yaw: 0 }, contactWeight: 0 };
  if (!family) return zero;
  const identity = dynamicAnimationIdentity(animal), partner = context.partner || null, role = partner ? pairedInteractionRole(animal, partner, context.actionKey) : { side: identity.lateralBias, phaseOffset: 0, pairKey: null };
  const seconds = Math.max(0, Number(context.wallTimeMs || 0) / 1000), wave = Math.sin(seconds * (2.1 + identity.variant % 5 * .17) * identity.tempo + identity.phaseOffset + role.phaseOffset), pulse = Math.max(0, Math.sin(seconds * 3.2 * identity.tempo + identity.phaseOffset + role.phaseOffset));
  const aggression = clamp(animal.aggression ?? .5, 0, 1), care = clamp(animal.careAffinity ?? .5, 0, 1), fatigue = clamp((animal.fatigue || 0) / 100, 0, 1), confidence = clamp(context.confidence ?? (1 - (animal.fear || 0) / 120), 0, 1);
  const strength = identity.amplitude * (.72 + aggression * .2 + confidence * .18) * (1 - fatigue * .38), contactWeight = partner ? clamp(1 - Math.max(0, Number(context.separation || 0) - Number(context.contactSpan || 0)) / Math.max(.2, Number(context.contactSpan || 1)), 0, 1) : 0;
  const pose = structuredClone(zero); pose.active = true; pose.family = family; pose.variant = identity.variant; pose.contactWeight = contactWeight; pose.pairKey = role.pairKey;
  if (family === "assessment") { pose.head.yaw = wave * .18 * strength; pose.head.lift = .035 * confidence; pose.body.yaw = role.side * .025 * strength; }
  else if (family === "display") { pose.body.lift = .045 * strength; pose.body.roll = role.side * .025 * strength; pose.head.lift = .07 * strength; pose.head.pitch = -.08 * strength; }
  else if (family === "submission") { pose.body.lift = -.07; pose.body.roll = role.side * .035; pose.head.lift = -.11; pose.head.pitch = .16; pose.head.yaw = role.side * .12; }
  else if (family === "contact-contest" || family === "contact-conflict") { pose.body.forward = pulse * .055 * strength * contactWeight; pose.body.pitch = -.08 * strength; pose.body.roll = wave * .035 * strength; pose.head.forward = .06 * contactWeight; pose.head.pitch = .16 * contactWeight; pose.head.roll = -wave * .055 * strength; }
  else if (family === "protective") { pose.body.lift = .035 * strength; pose.body.forward = .025 * pulse; pose.head.lift = .055; pose.head.yaw = wave * .06; }
  else if (family === "affiliative") { pose.body.lateral = role.side * .018 * wave * care; pose.head.yaw = role.side * (.08 + .05 * wave) * care; pose.head.lift = .025; }
  else if (family === "rejection") { pose.body.lateral = role.side * .035; pose.head.yaw = role.side * .24; pose.head.pitch = -.035; }
  else if (family === "communication") { pose.head.lift = .045; pose.head.pitch = -.04; pose.head.yaw = wave * .075; pose.body.lift = pulse * .008; }
  else if (family === "vigilance") { pose.head.lift = .06; pose.head.yaw = wave * .06; pose.body.lift = .02; }
  else if (family === "care") { pose.head.lift = -.02 * care; pose.head.yaw = role.side * wave * .045 * care; pose.body.roll = role.side * .012 * care; }
  for (const channel of [pose.body, pose.head, pose.tail]) for (const key of Object.keys(channel)) channel[key] = clamp(channel[key], -.3, .3);
  return Object.freeze(pose);
}

export const DYNAMIC_INTERACTION_ACTIONS = Object.freeze(Object.keys(ACTION_FAMILIES));
