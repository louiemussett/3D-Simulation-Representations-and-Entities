const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
function hash32(value = "") { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
const unit = value => hash32(value) / 4294967295;
const motif = (id, family, actions, weight = 1) => Object.freeze({ id, family, actions: Object.freeze(actions), weight });

export const DEER_DYNAMIC_MOTIFS = Object.freeze([
  motif("quiet-weight-shift", "idle", ["idle", "orient"]), motif("nose-to-wind", "idle", ["idle", "orient", "listen"]), motif("look-over-shoulder", "idle", ["idle", "orient"]), motif("brief-hoof-reset", "idle", ["idle"]),
  motif("slow-head-scan", "vigilance", ["orient", "search", "guard"]), motif("sharp-head-raise", "vigilance", ["listen", "freeze", "guard"]), motif("uncertain-alternating-look", "vigilance", ["search", "evaluate-prey"]), motif("retained-ear-attention", "vigilance", ["graze", "browse"]),
  motif("graze-pull-chew", "feeding", ["graze"]), motif("graze-step-select", "feeding", ["graze"]), motif("graze-vigilance-break", "feeding", ["graze"]), motif("browse-reach-pull", "feeding", ["browse"]), motif("drink-swallow", "drinking", ["drink"]), motif("drink-head-check", "drinking", ["drink"]),
  motif("relaxed-long-stride", "locomotion", ["travel", "wander", "join-herd"]), motif("cautious-high-head-walk", "locomotion", ["travel", "join-herd"]), motif("tired-short-stride", "locomotion", ["travel", "wander"]), motif("explosive-flight-launch", "flight", ["flee"]), motif("turning-escape", "flight", ["flee"]), motif("exhausted-flight", "flight", ["flee"]),
  motif("lying-rumination", "rest", ["rest", "deep-rest", "alert-rest"]), motif("alert-rest-head-high", "rest", ["rest", "alert-rest"]), motif("recovery-breath", "rest", ["recover-after-flight", "recover-after-combat", "active-recovery"]),
  motif("gentle-dependent-check", "care", ["guard", "allow-nursing", "attend-birth", "coordinate-group"]), motif("protective-body-screen", "care", ["protect-offspring", "defend", "intervene"]), motif("nursing-vigilance", "care", ["allow-nursing"]),
  motif("rut-head-high-roar", "rut-display", ["assess-rival", "communicate"]), motif("rut-neck-extended-roar", "rut-display", ["assess-rival", "communicate"]), motif("rut-side-on-display", "rut-display", ["dominance"]), motif("rut-ground-paw", "rut-display", ["dominance"]), motif("rut-parallel-left", "rut-walk", ["dominance"]), motif("rut-parallel-right", "rut-walk", ["dominance"]), motif("rut-contact-invitation", "rut-contact", ["spar"]), motif("rut-steady-antler-push", "rut-contact", ["spar"]), motif("rut-lateral-antler-twist", "rut-contact", ["spar"]), motif("rut-break-and-reassess", "rut-contact", ["spar"]), motif("rut-winner-display", "rut-resolution", ["dominance"]), motif("rut-loser-withdrawal", "rut-resolution", ["submit"]),
  motif("defensive-front-brace", "defence", ["defend", "protect-offspring"]), motif("defensive-hoof-threat", "defence", ["defend", "protect-offspring"]), motif("contact-break-to-flight", "defence", ["defend", "flee"]),
  motif("courtship-investigation", "courtship", ["courtship"]), motif("courtship-follow", "courtship", ["courtship"]), motif("courtship-rejection-turn", "courtship", ["reject"])
]);

export function deerAnimationDynamics(animal = {}) {
  const key = `${animal.id || "deer"}:updated-red-deer-animation`;
  const stage = { dependent: .78, juvenile: 1.16, subadult: 1.08, adult: 1, old: .8 }[animal.lifeStage] || 1;
  return Object.freeze({
    schemaVersion: 1, tempo: (.84 + unit(`${key}:tempo`) * .34) * stage, amplitude: .78 + unit(`${key}:amplitude`) * .36,
    vigilanceSpeed: .75 + unit(`${key}:vigilance`) * .5, displayConfidence: .7 + unit(`${key}:display`) * .6,
    preferredSide: unit(`${key}:side`) < .5 ? -1 : 1, phase: unit(`${key}:phase`) * Math.PI * 2
  });
}

function motifScore(entry, animal, context, recent) {
  const aggression = clamp(animal.aggression ?? .5), care = clamp(animal.careAffinity ?? .5), fear = clamp((animal.fear || 0) / 100), fatigue = clamp((animal.fatigue || 0) / 100), injured = clamp((animal.injuries?.length || 0) / 3);
  const relationship = context.partner ? animal.socialMemory?.[context.partner.id] || {} : {}, affinity = clamp((Number(relationship.affinity ?? 0) + 1) / 2);
  let score = entry.weight + unit(`${animal.id}:${context.epoch}:${entry.id}`) * .42 - recent.indexOf(entry.id) * -.08 - (recent.includes(entry.id) ? .7 : 0);
  if (["rut-display", "rut-contact", "defence"].includes(entry.family)) score += aggression * .42;
  if (["vigilance", "flight"].includes(entry.family)) score += fear * .38;
  if (entry.family === "care") score += care * .45;
  if (["care", "courtship"].includes(entry.family)) score += affinity * .22;
  if (["rut-display", "rut-contact"].includes(entry.family) && Number(relationship.grievance || 0) > 0) score += clamp(relationship.grievance) * .18;
  if (entry.id.includes("tired") || entry.id.includes("exhausted") || entry.id.includes("recovery")) score += fatigue * .7 + injured * .3;
  else score -= fatigue * .18;
  if (entry.id.includes("winner") && context.rutOutcome === "winner") score += 1.2;
  if (entry.id.includes("loser") && context.rutOutcome === "loser") score += 1.2;
  if (entry.id.includes("parallel-left") && context.preferredSide < 0 || entry.id.includes("parallel-right") && context.preferredSide > 0) score += .35;
  return score;
}

export function selectDeerAnimationMotif(animal = {}, context = {}) {
  if (animal.speciesId !== "valley-grazer-updated") return null;
  const actionKey = context.actionKey || animal.actionState?.key || "idle", dynamics = deerAnimationDynamics(animal), epoch = Math.floor(Math.max(0, Number(context.wallTimeMs || 0)) / Math.max(900, 2600 / dynamics.tempo));
  const candidates = DEER_DYNAMIC_MOTIFS.filter(entry => entry.actions.includes(actionKey));
  if (!candidates.length) return null;
  const scoredContext = { ...context, epoch, preferredSide: dynamics.preferredSide };
  const selected = candidates.slice().sort((left, right) => motifScore(right, animal, scoredContext, context.recentMotifs || []) - motifScore(left, animal, scoredContext, context.recentMotifs || []) || left.id.localeCompare(right.id))[0];
  return Object.freeze({ ...selected, epoch, dynamics });
}

export function deerDynamicPose(animal = {}, context = {}) {
  const selected = selectDeerAnimationMotif(animal, context), zero = { active: false, motifId: null, family: null, body: { lift: 0, forward: 0, lateral: 0, pitch: 0, roll: 0, yaw: 0 }, head: { lift: 0, forward: 0, pitch: 0, roll: 0, yaw: 0 }, tail: { pitch: 0, yaw: 0 } };
  if (!selected) return zero;
  const seconds = Number(context.wallTimeMs || 0) / 1000, d = selected.dynamics, wave = Math.sin(seconds * 2.2 * d.tempo + d.phase), slow = Math.sin(seconds * .9 * d.tempo + d.phase), pulse = Math.max(0, wave), aggression = clamp(animal.aggression ?? .5), fear = clamp((animal.fear || 0) / 100), fatigue = clamp((animal.fatigue || 0) / 100), pregnancyCaution = animal.pregnant ? .82 : 1, amplitude = d.amplitude * (1 - fatigue * .28) * pregnancyCaution;
  const contactWeight = context.partner ? clamp(1 - Math.max(0, Number(context.separation || 0) - Number(context.contactSpan || 0)) / Math.max(.2, Number(context.contactSpan || 1)), 0, 1) : 0;
  const pose = structuredClone(zero); pose.active = true; pose.motifId = selected.id; pose.family = selected.family; pose.epoch = selected.epoch;
  if (selected.family === "idle") { pose.body.roll = slow * .014 * amplitude; pose.head.yaw = wave * .08 * d.vigilanceSpeed; pose.head.lift = selected.id === "nose-to-wind" ? .055 : 0; }
  else if (selected.family === "vigilance") { pose.head.lift = selected.id === "sharp-head-raise" ? .12 : .065; pose.head.yaw = wave * (selected.id === "uncertain-alternating-look" ? .2 : .08) * d.vigilanceSpeed; pose.body.lift = .018; }
  else if (selected.family === "feeding") { pose.head.yaw = wave * .045; pose.head.forward = pulse * .025; pose.head.pitch = wave * .025; if (selected.id.includes("vigilance")) pose.head.lift = pulse * .13; }
  else if (selected.family === "drinking") { pose.head.lift = selected.id === "drink-head-check" ? pulse * .11 : 0; pose.head.pitch = selected.id === "drink-swallow" ? wave * .018 : -pulse * .05; }
  else if (selected.family === "locomotion") { pose.body.roll = wave * .02; pose.body.lift = pulse * .018; pose.head.lift = selected.id.includes("high-head") ? .07 : selected.id.includes("tired") ? -.025 : 0; }
  else if (selected.family === "flight") { pose.body.pitch = -.06 - fear * .05; pose.body.lift = pulse * .045 * (1 - fatigue * .5); pose.head.forward = .045; pose.tail.pitch = -.08; }
  else if (selected.family === "rest") { pose.body.lift = -Math.abs(slow) * .012; pose.head.lift = selected.id.includes("head-high") ? .09 : -.02; pose.head.yaw = wave * .035; }
  else if (selected.family === "care") { pose.head.yaw = slow * .055; pose.head.lift = .035; pose.body.lateral = d.preferredSide * .012; }
  else if (selected.family === "rut-display") { pose.body.lift = .06 * d.displayConfidence; pose.head.lift = .1; pose.head.pitch = selected.id.includes("neck-extended") ? -.13 : -.07; pose.head.forward = selected.id.includes("neck-extended") ? .08 : .03; }
  else if (selected.family === "rut-walk") { pose.body.lateral = d.preferredSide * .035; pose.body.roll = wave * .025; pose.head.yaw = d.preferredSide * .09; pose.head.lift = .055; }
  else if (selected.family === "rut-contact") { pose.body.forward = pulse * .075 * (.7 + aggression * .3) * contactWeight; pose.body.pitch = -.1 * contactWeight; pose.body.roll = wave * (selected.id.includes("lateral") ? .075 : .035) * contactWeight; pose.head.forward = .05 * contactWeight; pose.head.pitch = .2 * contactWeight; pose.head.roll = -wave * .075 * contactWeight; }
  else if (selected.family === "rut-resolution") { const winner = selected.id.includes("winner"); pose.body.lift = winner ? .08 : -.055; pose.head.lift = winner ? .11 : -.1; pose.head.yaw = winner ? wave * .04 : d.preferredSide * .18; }
  else if (selected.family === "defence") { pose.body.pitch = -.07; pose.body.lift = pulse * .065; pose.head.lift = .055; pose.head.forward = .045; }
  else if (selected.family === "courtship") { pose.head.yaw = d.preferredSide * (.07 + slow * .04); pose.head.lift = selected.id.includes("rejection") ? .03 : -.025; pose.body.lateral = d.preferredSide * .018; }
  for (const channel of [pose.body, pose.head, pose.tail]) for (const key of Object.keys(channel)) channel[key] = clamp(channel[key], -.28, .28);
  return Object.freeze(pose);
}
