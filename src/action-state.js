export const ACTION_PRESENTATION = Object.freeze({
  idle: { label: "Idle", posture: "stand" }, orient: { label: "Orienting", posture: "scan" },
  rest: { label: "Resting", posture: "rest" }, travel: { label: "Travelling", posture: "travel" },
  wander: { label: "Exploring", posture: "travel" }, graze: { label: "Grazing", posture: "feed" },
  browse: { label: "Browsing", posture: "feed" }, drink: { label: "Drinking", posture: "drink" },
  flee: { label: "Fleeing", posture: "flee" }, "join-herd": { label: "Joining herd", posture: "chase" },
  "shelter-herd": { label: "Sheltering with herd", posture: "guard" },
  "evaluate-prey": { label: "Evaluating prey", posture: "scan" }, stalk: { label: "Stalking", posture: "stalk" },
  chase: { label: "Chasing prey", posture: "chase" }, attack: { label: "Attacking", posture: "chase" },
  search: { label: "Searching", posture: "scan" }, listen: { label: "Listening", posture: "listen" },
  "track-scent": { label: "Tracking scent", posture: "sniff" }, guard: { label: "Guarding", posture: "guard" },
  defend: { label: "Defending", posture: "guard" }, blocked: { label: "Blocked", posture: "blocked" },
  courtship: { label: "Courting", posture: "stand" }, reject: { label: "Rejecting courtship", posture: "scan" },
  scavenge: { label: "Scavenging", posture: "feed" }, nurse: { label: "Nursing", posture: "feed" },
  communicate: { label: "Communicating", posture: "listen" }, dependent: { label: "Depending on caregiver", posture: "stand" },
  "coordinate-group": { label: "Coordinating group", posture: "scan" },
  "abandon-hunt": { label: "Abandoning hunt", posture: "rest" },
  "claim-kill": { label: "Claiming kill", posture: "guard" }, "yield-carcass": { label: "Yielding carcass", posture: "scan" },
  "feed-carcass": { label: "Feeding from carcass", posture: "feed" },
  "protect-offspring": { label: "Protecting offspring", posture: "chase" }
});

export const ACTION_KEYS = Object.freeze(Object.keys(ACTION_PRESENTATION));

export function directionTo(from, destination) {
  if (!destination || !Number.isFinite(destination.x) || !Number.isFinite(destination.z)) return null;
  const dx = destination.x - (Number(from?.x) || 0), dz = destination.z - (Number(from?.z) || 0);
  return Math.hypot(dx, dz) > 1e-9 ? Math.atan2(dz, dx) : null;
}

export function createActionState(key = "idle", options = {}) {
  if (!ACTION_PRESENTATION[key]) throw new Error(`Unknown action key: ${key}`);
  const moving = Boolean(options.moving);
  const destination = moving && options.destination ? { x: options.destination.x, z: options.destination.z } : null;
  return {
    key,
    target: options.target ?? null,
    destination,
    intendedOutcome: options.intendedOutcome || ACTION_PRESENTATION[key].label,
    moving,
    direction: moving ? directionTo(options.from, destination) : null,
    label: options.label || ACTION_PRESENTATION[key].label,
    reason: options.reason || null
  };
}

export function setAction(animal, key, options = {}) {
  const state = createActionState(key, { ...options, from: options.from || { x: animal.fx ?? animal.x, z: animal.fz ?? animal.z } });
  animal.actionState = state;
  animal.currentAction = state.label;
  animal.actionTarget = state.target;
  if (!state.moving) {
    animal.visualMove = null;
    animal.motionTarget = null;
    animal.moveIntent = null;
    animal.movementNoise = 0;
  }
  return state;
}

export function setBlockedAction(animal, reason, options = {}) {
  return setAction(animal, "blocked", { ...options, reason, moving: false });
}

export function completeActionArrival(animal, key, options = {}) {
  return setAction(animal, key, { ...options, destination: null, moving: true });
}

export function migrateActionState(animal) {
  if (animal?.actionState && ACTION_PRESENTATION[animal.actionState.key]) {
    animal.actionState = createActionState(animal.actionState.key, { ...animal.actionState, from: animal });
    animal.currentAction = animal.actionState.label;
    animal.actionTarget = animal.actionState.target;
    return animal.actionState;
  }
  return setAction(animal, "idle", { label: animal?.currentAction || "Idle", intendedOutcome: "Await the next decision" });
}

export function completedVisibleVelocity(move, now, paused = false) {
  if (paused || !move || !Number.isFinite(move.duration) || move.duration <= 0 || now >= move.started + move.duration) return 0;
  return Math.hypot(move.toX - move.fromX, move.toZ - move.fromZ) / move.duration;
}

export function clearFrameMotion(animal) {
  animal.visualMove = null;
  animal.motionTarget = null;
  animal.moveIntent = null;
  animal.movementNoise = 0;
}
