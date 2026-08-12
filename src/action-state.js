export const ACTION_PRESENTATION = Object.freeze({
  idle: { label: "Idle", posture: "stand" }, orient: { label: "Orienting", posture: "scan" },
  rest: { label: "Resting", posture: "rest" }, travel: { label: "Travelling", posture: "travel" },
  "active-recovery": { label: "Recovering while alert", posture: "listen" },
  "alert-rest": { label: "Resting with head raised", posture: "rest" },
  "deep-rest": { label: "Resting deeply", posture: "rest" },
  sleep: { label: "Sleeping for physiological recovery", posture: "collapse" },
  wake: { label: "Waking", posture: "listen" },
  "orient-after-waking": { label: "Orienting after waking", posture: "scan" },
  "recover-after-combat": { label: "Recovering after combat", posture: "rest" },
  "recover-after-flight": { label: "Recovering after flight", posture: "listen" },
  "recover-after-travel": { label: "Recovering after prolonged travel", posture: "rest" },
  wander: { label: "Exploring", posture: "travel" }, graze: { label: "Grazing", posture: "feed" },
  browse: { label: "Browsing", posture: "feed" }, drink: { label: "Drinking", posture: "drink" },
  flee: { label: "Fleeing", posture: "flee" }, "join-herd": { label: "Joining herd", posture: "chase" },
  "shelter-herd": { label: "Sheltering with herd", posture: "guard" },
  "evaluate-prey": { label: "Evaluating prey", posture: "scan" }, stalk: { label: "Stalking", posture: "stalk" },
  chase: { label: "Chasing prey", posture: "chase" }, attack: { label: "Attacking", posture: "chase" },
  search: { label: "Searching", posture: "scan" }, listen: { label: "Listening", posture: "listen" }, freeze: { label: "Freezing to assess danger", posture: "listen" },
  "track-scent": { label: "Tracking scent", posture: "sniff" }, guard: { label: "Guarding", posture: "guard" },
  defend: { label: "Defending", posture: "guard" }, blocked: { label: "Blocked", posture: "blocked" },
  courtship: { label: "Courting", posture: "stand" }, "accept-mate": { label: "Accepting mate", posture: "stand" },
  mating: { label: "Mating", posture: "mate" }, reject: { label: "Rejecting courtship", posture: "scan" },
  birth: { label: "Giving birth", posture: "birth" }, "attend-birth": { label: "Attending birth", posture: "guard" },
  scavenge: { label: "Scavenging", posture: "feed" }, nurse: { label: "Nursing", posture: "suckle" },
  "allow-nursing": { label: "Allowing offspring to nurse", posture: "nursing-mother" },
  communicate: { label: "Communicating", posture: "listen" }, dependent: { label: "Depending on caregiver", posture: "stand" },
  "coordinate-group": { label: "Coordinating group", posture: "scan" },
  "abandon-hunt": { label: "Abandoning hunt", posture: "rest" },
  "claim-kill": { label: "Claiming kill", posture: "guard" }, "yield-carcass": { label: "Yielding carcass", posture: "scan" },
  "feed-carcass": { label: "Feeding from carcass", posture: "feed" },
  "protect-offspring": { label: "Protecting offspring", posture: "chase" },
  "seek-cool": { label: "Seeking cooler ground", posture: "travel" },
  "seek-warm": { label: "Seeking warmer ground", posture: "travel" },
  cool: { label: "Cooling down", posture: "rest" }, warm: { label: "Warming up", posture: "rest" },
  dominance: { label: "Displaying dominance", posture: "guard" }, submit: { label: "Showing submission", posture: "rest" },
  spar: { label: "Sparring", posture: "chase" }, "social-attack": { label: "Fighting conspecific", posture: "chase" },
  intervene: { label: "Intervening in conflict", posture: "guard" },
  "assess-rival": { label: "Assessing a social rival", posture: "scan" },
  "leave-group": { label: "Leaving group", posture: "travel" },
  "caregiver-dispute": { label: "Disputing care", posture: "guard" },
  "abandon-dependent": { label: "Abandoning dependent", posture: "travel" },
  collapse: { label: "Collapsed from complete exertion", posture: "collapse" }
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
    animal.movementRequest = null;
    animal.routeState = null;
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

export const MIN_VISUAL_MOVE_DURATION_MS = 80;

export function createRetargetedVisualMove(start, destination, {
  now,
  duration,
  minimumDuration = MIN_VISUAL_MOVE_DURATION_MS,
  maximumAuthoritativeStep = 3
} = {}) {
  if (!start || !destination || !Number.isFinite(now)) return null;
  const fromX = Number(start.x), fromZ = Number(start.z), toX = Number(destination.x), toZ = Number(destination.z);
  if (![fromX, fromZ, toX, toZ].every(Number.isFinite)) return null;

  // Screen position may deliberately trail the simulation at accelerated
  // observation speeds. Only a large authoritative step is a true teleport;
  // measuring from the trailing screen position incorrectly classifies normal
  // accumulated locomotion as one and makes the model snap.
  const authoritativeFromX = Number.isFinite(start.authoritativeX) ? start.authoritativeX : fromX;
  const authoritativeFromZ = Number.isFinite(start.authoritativeZ) ? start.authoritativeZ : fromZ;
  const travelledBefore = Number(start.authoritativeDistanceTravelled);
  const travelledAfter = Number(destination.authoritativeDistanceTravelled);
  const recordedLocomotion = Number.isFinite(travelledBefore) && Number.isFinite(travelledAfter) ? Math.max(0, travelledAfter - travelledBefore) : 0;
  const permittedStep = Math.max(maximumAuthoritativeStep, recordedLocomotion + .5);
  if (Math.hypot(toX - authoritativeFromX, toZ - authoritativeFromZ) > permittedStep) return null;

  return {
    fromX,
    fromZ,
    toX,
    toZ,
    fromOrientation: Number.isFinite(start.orientation) ? start.orientation : 0,
    toOrientation: Number.isFinite(destination.orientation) ? destination.orientation : 0,
    started: now,
    duration: Math.max(minimumDuration, Number.isFinite(duration) && duration > 0 ? duration : minimumDuration)
  };
}

export function clearFrameMotion(animal) {
  animal.visualMove = null;
  animal.motionTarget = null;
  animal.moveIntent = null;
  animal.movementRequest = null;
  animal.routeState = null;
  animal.movementNoise = 0;
}
