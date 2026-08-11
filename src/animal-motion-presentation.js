const LOWERED_POSTURES = new Set(["stalk", "rest", "birth", "suckle", "nursing-mother"]);
const GROUND_REST_POSTURES = new Set(["rest", "suckle", "nursing-mother"]);

export function isGroundRestPosture(posture = "idle") {
  return GROUND_REST_POSTURES.has(posture);
}

export function postureTransitionDuration(animal = {}) {
  const stageSeconds = {
    dependent: .65,
    juvenile: .55,
    subadult: .8,
    adult: 1.05,
    old: 2.15
  }[animal.lifeStage] ?? 1.05;
  const health = Number.isFinite(Number(animal.health)) ? Number(animal.health) : 100;
  const healthBurden = Math.max(0, Math.min(1, (100 - health) / 100));
  const fatigueBurden = Math.max(0, Math.min(1, (Number(animal.fatigue) || 0) / 100));
  const injuryBurden = Math.min(1, (animal.injuries?.length || 0) / 3);
  const maternalBurden = animal.actionState?.key === "allow-nursing" ? .25 : 0;
  return Math.max(.5, Math.min(4, stageSeconds + healthBurden * .9 + fatigueBurden * .75 + injuryBurden * .7 + maternalBurden));
}

export function smoothPostureProgress(from = 0, target = 0, elapsedMs = 0, durationMs = 1000) {
  const t = Math.max(0, Math.min(1, elapsedMs / Math.max(1, durationMs)));
  const eased = t * t * (3 - 2 * t);
  return from + (target - from) * eased;
}

export function gradualHeading(current = 0, desired = 0, maxTurn = Math.PI / 24, deadZone = Math.PI / 120) {
  const delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
  if (Math.abs(delta) <= deadZone) return current;
  const step = Math.max(-Math.abs(maxTurn), Math.min(Math.abs(maxTurn), delta));
  return Math.atan2(Math.sin(current + step), Math.cos(current + step));
}

export function requiresTurnInPlace(current = 0, desired = 0, tolerance = Math.PI / 18) {
  return Math.abs(Math.atan2(Math.sin(desired - current), Math.cos(desired - current))) > tolerance;
}

export function movingTurnTolerance(fastLocomotion = false) {
  return fastLocomotion ? Math.PI * 2 / 15 : Math.PI / 18;
}

export function animalGroundOffset(scale = 1, posture = "idle") {
  const safeScale = Math.max(.2, Number(scale) || 1);
  if (posture === "collapse") return safeScale * .06;
  // A grounded rest must put the underside of the ellipsoid into contact with
  // the terrain. A tiny negative root clearance lets the soft abstract body
  // settle into slopes instead of visibly hovering above them.
  if (GROUND_REST_POSTURES.has(posture)) return safeScale * -.02;
  return safeScale * (LOWERED_POSTURES.has(posture) ? .08 : .12);
}

const gait = (family, label, cadence, amplitude, feedingStyle, stalk = true) => Object.freeze({ family, label, cadence, amplitude, feedingStyle, stalk });

// These are presentation gaits, not hidden speed modifiers. With only a head
// and body as primary masses, cadence, lift, pitch, roll and lateral motion do
// the work that a more skeletal renderer would assign to individual limbs.
export const SPECIES_LOCOMOTION = Object.freeze({
  grazer: gait("elastic-walk", "elastic deer walk and bounding run", .0042, .045, "graze"),
  hunter: gait("lope", "wolf-like walk, lope and ground stalk", .004, .04, "tear"),
  "meadow-nibbler": gait("hop", "compact rabbit hop", .0068, .115, "nibble", false),
  "great-plains-grazer": gait("heavy-plod", "heavy rolling plod", .0032, .032, "graze"),
  "woodland-browser": gait("long-stride", "long high woodland stride", .0035, .05, "browse"),
  "brush-fox": gait("light-trot", "light fox trot and low stalk", .0052, .048, "tear"),
  "shadow-stalker": gait("stealth-bound", "soft feline walk and low bound", .0047, .052, "tear"),
  "great-omnivore": gait("amble", "rolling bear amble", .0034, .04, "mixed-forage"),
  "dryland-runner": gait("spring-run", "springing endurance run", .0052, .06, "graze"),
  "highland-grazer": gait("high-step", "careful high mountain step", .0041, .06, "graze"),
  "armoured-browser": gait("heavy-trot", "weighty rhinoceros walk and trot", .0035, .035, "browse"),
  "pack-breaker": gait("lope", "sloping hyena lope", .0046, .043, "crush-tear"),
  "carrion-runner": gait("waddle", "grounded vulture waddle", .005, .034, "peck", false),
  "waterline-grazer": gait("low-trot", "low capybara walk and trot", .0048, .045, "graze"),
  "brush-nibbler": gait("bound", "long hare bound", .0064, .135, "nibble", false),
  "waterline-ambusher": gait("belly-crawl", "low crocodilian belly crawl", .003, .018, "swallow"),
  "northern-shaggy-grazer": gait("heavy-plod", "compact musk-ox plod", .0031, .034, "graze"),
  "highland-prowler": gait("stealth-bound", "soft mountain-cat stalk and bound", .0045, .055, "tear"),
  "little-opportunist": gait("shuffle", "dexterous raccoon shuffle", .0053, .043, "mixed-forage"),
  "cold-country-scavenger": gait("waddle", "grounded bearded-vulture waddle", .0048, .032, "peck", false),
  "sunscale-ambusher": gait("serpentine", "serpentine python crawl", .0033, .012, "swallow"),
  "shieldback-colony": gait("shell-plod", "slow tortoise crawl", .0022, .018, "crop", false),
  "wild-boar": gait("rooting-trot", "short forceful boar trot", .0047, .044, "root"),
  "african-elephant": gait("heavy-amble", "slow weight-shifting elephant amble", .0027, .032, "strip"),
  dromedary: gait("rolling-pace", "rolling camel pace", .0034, .062, "browse"),
  "common-ostrich": gait("high-step-run", "high stepping ostrich walk and run", .0058, .072, "peck", false)
});

const genericGait = gait("elastic-walk", "ordinary walk", .0032, .04, "graze");
export const speciesLocomotionProfile = subject => SPECIES_LOCOMOTION[typeof subject === "string" ? subject : subject?.speciesId] || genericGait;

export function locomotionAnimation(speciesOrPosture = "idle", postureOrNow = 0, possibleNow = 0, terrain = {}) {
  // Keep the historical (posture, now) call valid for small presentation tools.
  const legacy = typeof postureOrNow === "number";
  const speciesId = legacy ? null : speciesOrPosture;
  const posture = legacy ? speciesOrPosture : postureOrNow;
  const nowMs = legacy ? postureOrNow : possibleNow;
  const profile = speciesId ? speciesLocomotionProfile(speciesId) : genericGait;
  if (!["travel", "flee", "chase", "stalk"].includes(posture)) return Object.freeze({ active: false, gait: profile.family, gaitLabel: profile.label, bob: 0, frequency: 0, bodyPitch: 0, bodyRoll: 0, bodyYaw: 0, headPitch: 0, headYaw: 0, headBob: 0, bodyLower: 0, headLower: 0, headForward: 0, lengthScale: 1 });
  const stalking = posture === "stalk" && profile.stalk;
  const urgent = posture === "flee" || posture === "chase";
  const terrainLoad = terrain?.wetland || terrain?.landCover === "swamp" || terrain?.landCover === "woodedSwamp" ? .82 : terrain?.rocky ? .9 : 1;
  const frequency = stalking ? .0022 : profile.cadence * (urgent ? 2.05 : 1) * terrainLoad;
  const wave = Math.sin(nowMs * frequency), counter = Math.cos(nowMs * frequency), positive = Math.max(0, wave);
  const amplitude = profile.amplitude * (urgent ? 1.25 : 1);
  const motion = { active: true, gait: stalking ? "ground-stalk" : profile.family, gaitLabel: stalking ? `lowered ${profile.label}` : profile.label, bob: Math.abs(wave) * amplitude, frequency, bodyPitch: 0, bodyRoll: 0, bodyYaw: 0, headPitch: 0, headYaw: 0, headBob: 0, bodyLower: 0, headLower: 0, headForward: 0, lengthScale: 1 };
  if (stalking) Object.assign(motion, { bob: Math.abs(wave) * .009, bodyLower: .15, headLower: .12, headForward: .07, bodyPitch: -.055 + wave * .012, headPitch: .035, lengthScale: 1.04 });
  else if (["hop", "bound", "spring-run", "stealth-bound"].includes(profile.family)) Object.assign(motion, { bob: positive ** 1.45 * amplitude, bodyPitch: counter * (profile.family === "bound" ? .16 : .1), headPitch: -counter * .07, lengthScale: 1 + Math.abs(counter) * .035 });
  else if (["heavy-plod", "heavy-trot", "heavy-amble"].includes(profile.family)) Object.assign(motion, { bob: Math.abs(wave) * amplitude, bodyRoll: counter * .035, headBob: -Math.abs(wave) * .018 });
  else if (["waddle", "shuffle", "rolling-pace"].includes(profile.family)) Object.assign(motion, { bodyRoll: wave * (profile.family === "rolling-pace" ? .075 : .095), headYaw: -wave * .06 });
  else if (["belly-crawl", "shell-plod"].includes(profile.family)) Object.assign(motion, { bodyLower: profile.family === "belly-crawl" ? .14 : .06, bodyRoll: wave * .025, headYaw: -wave * .04, bob: Math.abs(wave) * .009 });
  else if (profile.family === "serpentine") Object.assign(motion, { bodyLower: .1, bodyYaw: wave * .18, headYaw: -wave * .13, bob: .004 });
  else if (["high-step", "high-step-run"].includes(profile.family)) Object.assign(motion, { bob: positive * amplitude, bodyPitch: counter * .045, headBob: positive * .025 });
  else if (profile.family === "rooting-trot") Object.assign(motion, { bodyPitch: counter * .035, headBob: -Math.abs(wave) * .035 });
  else Object.assign(motion, { bodyPitch: counter * (urgent ? .055 : .025), headPitch: -counter * .018 });
  return Object.freeze(motion);
}

export function feedingAnimation(subject, nowMs = 0, drinking = false) {
  const profile = speciesLocomotionProfile(subject), style = drinking ? "drink" : profile.feedingStyle;
  const frequency = ({ nibble: .015, peck: .013, root: .008, strip: .004, swallow: .0035, browse: .005, "mixed-forage": .006 }[style] || .0075);
  const wave = Math.sin(nowMs * frequency), pulse = Math.abs(wave);
  const poses = {
    drink: { headDrop: .25, headForward: .015, headPitch: .3, bodyPitch: 0, headYaw: 0 },
    graze: { headDrop: .25 + pulse * .025, headForward: .02, headPitch: .3 + wave * .025, bodyPitch: .01, headYaw: 0 },
    nibble: { headDrop: .13 + pulse * .025, headForward: .05, headPitch: .18, bodyPitch: .03, headYaw: wave * .035 },
    browse: { headDrop: -.035 + wave * .025, headForward: .08, headPitch: -.08, bodyPitch: 0, headYaw: wave * .07 },
    tear: { headDrop: .2, headForward: .06, headPitch: .24 + wave * .09, bodyPitch: .025, headYaw: wave * .1 },
    "crush-tear": { headDrop: .18, headForward: .07, headPitch: .22 + wave * .07, bodyPitch: .035, headYaw: wave * .08 },
    peck: { headDrop: .1 + pulse * .2, headForward: .09, headPitch: .18 + pulse * .22, bodyPitch: .035, headYaw: 0 },
    swallow: { headDrop: .025, headForward: .045, headPitch: -wave * .04, bodyPitch: 0, headYaw: wave * .035 },
    crop: { headDrop: .11 + pulse * .035, headForward: .045, headPitch: .15, bodyPitch: 0, headYaw: wave * .025 },
    root: { headDrop: .2, headForward: .09 + pulse * .03, headPitch: .28, bodyPitch: .04, headYaw: wave * .12 },
    strip: { headDrop: .03, headForward: .11, headPitch: -.04 + wave * .035, bodyPitch: 0, headYaw: wave * .05 },
    "mixed-forage": { headDrop: .12 + pulse * .06, headForward: .07, headPitch: .16, bodyPitch: .02, headYaw: wave * .09 }
  };
  return Object.freeze({ style, frequency, ...(poses[style] || poses.graze) });
}

export function matingPosture(speciesId = "grazer", scale = 1) {
  const safeScale = Math.max(.2, Number(scale) || 1);
  const hunter = speciesId === "hunter";
  return Object.freeze({
    bodyPitch: hunter ? Math.PI / 5.2 : Math.PI / 5.8,
    bodyLift: safeScale * (hunter ? .18 : .16),
    headLift: safeScale * (hunter ? .34 : .28),
    headForward: safeScale * (hunter ? .04 : .025),
    headPitch: hunter ? -.1 : -.07
  });
}
