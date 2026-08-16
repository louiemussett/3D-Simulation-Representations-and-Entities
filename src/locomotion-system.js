import { findNavPath } from "./navmesh-pathfinding.js";
import { bodyRadius, collisionRadiusFor, resolveAnimalBodyCollision, softSeparation } from "./interaction-spacing.js";
import { predictIntercept, steeringStep } from "./steering-controller.js";
import { SPECIES, SPECIES_IDS, eatsMeat } from "./species-registry.js";
import { biologicalPhenotype } from "./biological-phenotypes.js";
import { mobilityStrengthIndex, terrainMobilityAssessment } from "./terrain-mobility.js";
export const LOCOMOTION_SUBSTEPS = 8;
export const LOCOMOTION_TIME_UNIT = "ecological-hour";
export const realtimeLocomotionHours = (seconds, scale = 1) => Math.max(0, Number(seconds) || 0) * Math.max(0, Number(scale) || 0);
const BASE_LOCOMOTION_PROFILES = {
  grazer: { maxSpeed: .92, sprintSpeed: 1.55, acceleration: 2.1, braking: 2.8, turnRate: 2.5, bodyRadius: .27, separationWeight: .85, predictionCap: 1.6 },
  hunter: { maxSpeed: 1.02, sprintSpeed: 1.72, acceleration: 2.35, braking: 3.05, turnRate: 2.8, bodyRadius: .3, separationWeight: .72, predictionCap: 2.1 }
};
const radiusBySize = { tiny: .14, small: .21, medium: .28, large: .43, giant: .58 };
export const LOCOMOTION_PROFILES = Object.freeze(Object.fromEntries(SPECIES_IDS.map((id) => {
  if (BASE_LOCOMOTION_PROFILES[id]) return [id, BASE_LOCOMOTION_PROFILES[id]];
  const species = SPECIES[id], biology = biologicalPhenotype(id)?.locomotion || {}, meat = eatsMeat(id), speed = species.speed || 1, radius = radiusBySize[species.sizeClass] || .28;
  return [id, { maxSpeed: .92 * speed, sprintSpeed: (meat ? 1.68 : 1.52) * speed * (biology.sprint || 1), acceleration: (meat ? 2.35 : 2.1) * (biology.acceleration || 1), braking: (meat ? 3.05 : 2.8) * (biology.recovery || 1), turnRate: (species.sizeClass === "tiny" ? 3.3 : species.sizeClass === "large" || species.sizeClass === "giant" ? 2.05 : 2.65) * (biology.turning || 1), bodyRadius: radius, separationWeight: meat ? .72 : .85, predictionCap: meat ? 2.1 : 1.6, terrain: biology }];
})));
export function createLocomotionState(animal, profile = LOCOMOTION_PROFILES[animal.speciesId]) { return { x: animal.x, z: animal.z, vx: 0, vz: 0, heading: animal.orientation || 0, angularVelocity: 0, collisionRadius: collisionRadiusFor(animal, profile.bodyRadius), mode: "idle", activeMode: "idle", completedMode: null, completedRequestId: null, completedContactIntent: null, arrivalState: "idle", distanceTravelled: 0, turningEffort: 0 }; }
export function createMovementRequest(id, destination, options = {}) { const observedVelocity = options.perceivedTarget?.motionObservation?.velocity?.estimate; return { id, destination: { x: destination.x, z: destination.z }, destinationSource: options.destinationSource || "world", commitmentId: options.commitmentId || null, targetKey: options.targetKey || null, contactId: options.contactId || null, routeId: options.routeId || null, movementPurpose: options.movementPurpose || null, localAdjustment: options.localAdjustment || null, createdTick: options.createdTick ?? null, lastMaterialUpdateTick: options.lastMaterialUpdateTick ?? options.createdTick ?? null, allowOutsideNavmesh: Boolean(options.allowOutsideNavmesh), perceivedTarget: options.perceivedTarget || null, observationId: options.observationId || options.perceivedTarget?.evidenceId || null, observationTick: options.observationTick ?? options.perceivedTarget?.observedTick ?? null, predictedVelocity: options.predictedVelocity || (observedVelocity ? { vx: observedVelocity.x, vz: observedVelocity.z } : options.perceivedTarget && Number.isFinite(options.perceivedTarget.vx) && Number.isFinite(options.perceivedTarget.vz) ? { vx: options.perceivedTarget.vx, vz: options.perceivedTarget.vz } : null), velocityConfidence: options.velocityConfidence ?? options.perceivedTarget?.motionObservation?.velocity?.confidence ?? options.perceivedTarget?.velocityConfidence ?? 0, velocityUncertainty: options.velocityUncertainty ?? options.perceivedTarget?.velocityUncertainty ?? null, targetRegion: options.targetRegion || null, hypothesisId: options.hypothesisId || null, interactionRadius: options.interactionRadius || 0, urgency: options.urgency || 0, mode: options.mode || "walk", completionCondition: options.completionCondition || "arrival", contactTargetId: options.contactTargetId || null, contactIntent: options.contactIntent || null, motorDelayHours: Math.max(0, Number(options.motorDelayHours) || 0), motorDelayReason: options.motorDelayReason || null }; }
export function equivalentMovementRequest(current, next, epsilon = .08) {
  if (!current || !next || current.id !== next.id || current.mode !== next.mode || current.destinationSource !== next.destinationSource || current.contactTargetId !== next.contactTargetId || current.commitmentId !== next.commitmentId || current.targetKey !== next.targetKey) return false;
  return Math.hypot(Number(current.destination?.x) - Number(next.destination?.x), Number(current.destination?.z) - Number(next.destination?.z)) <= epsilon;
}

const movementRequestIdentityEqual = (current, next) => Boolean(current && next
  && current.id === next.id && current.mode === next.mode && current.destinationSource === next.destinationSource
  && current.contactTargetId === next.contactTargetId && current.commitmentId === next.commitmentId && current.targetKey === next.targetKey
  && current.movementPurpose === next.movementPurpose);

export function movementRetargetDecision(current, next, origin, tick, { epsilon = .08, reversalHoldTicks = 3, routeBlocked = false } = {}) {
  if (!movementRequestIdentityEqual(current, next)) return Object.freeze({ retain: false, reason: "movement identity changed" });
  const oldDistance = Math.hypot(Number(current.destination?.x) - Number(origin?.x), Number(current.destination?.z) - Number(origin?.z));
  const newDistance = Math.hypot(Number(next.destination?.x) - Number(origin?.x), Number(next.destination?.z) - Number(origin?.z));
  const destinationDelta = Math.hypot(Number(current.destination?.x) - Number(next.destination?.x), Number(current.destination?.z) - Number(next.destination?.z));
  if (destinationDelta <= epsilon) return Object.freeze({ retain: true, reason: "equivalent destination" });
  if (routeBlocked || oldDistance <= Math.max(.12, Number(current.interactionRadius || 0))) return Object.freeze({ retain: false, reason: routeBlocked ? "route blocked" : "incumbent destination reached" });
  const oldHeading = Math.atan2(Number(current.destination.z) - Number(origin.z), Number(current.destination.x) - Number(origin.x));
  const newHeading = Math.atan2(Number(next.destination.z) - Number(origin.z), Number(next.destination.x) - Number(origin.x));
  const reversal = Math.abs(Math.atan2(Math.sin(newHeading - oldHeading), Math.cos(newHeading - oldHeading)));
  const age = Number(tick) - Number(current.lastMaterialUpdateTick ?? current.createdTick ?? tick);
  if (reversal >= Math.PI * .72 && age < reversalHoldTicks && newDistance > .12) return Object.freeze({ retain: true, reason: "opposite destination suppressed during heading hold", reversalRadians: reversal, remainingTicks: reversalHoldTicks - age });
  return Object.freeze({ retain: false, reason: reversal >= Math.PI * .72 ? "heading hold elapsed" : "material destination update", reversalRadians: reversal });
}
function speedForMode(profile, mode) {
  if (mode === "stationary") return 0;
  if (mode === "slow-walk") return profile.maxSpeed * .42;
  if (mode === "stalk") return profile.maxSpeed * .48;
  if (mode === "sustainable-run" || mode === "run") return Math.min(profile.sprintSpeed * .72, profile.maxSpeed * 1.28);
  if (mode === "fast-run") return Math.min(profile.sprintSpeed * .9, profile.maxSpeed * 1.52);
  if (mode === "sprint") return profile.sprintSpeed;
  return profile.maxSpeed;
}
function effectiveProfile(animal, profile) {
  const speciesSpeed = Math.max(.01, SPECIES[animal.speciesId]?.speed || 1), capability = animal.capabilities || {};
  const condition = capability.canTravel === false ? 0 : Math.max(0, Math.min(1.35, Number(capability.speed ?? speciesSpeed) / speciesSpeed));
  return { ...profile, maxSpeed: profile.maxSpeed * condition, sprintSpeed: profile.sprintSpeed * condition, acceleration: profile.acceleration * Math.max(.25, condition), braking: profile.braking * Math.max(.5, Math.sqrt(condition || .01)) };
}
export function predictedRequestDestination(request, origin, profile, elapsed = 0) {
  if (!request?.perceivedTarget || request.destinationSource !== "perceived-evidence") return request?.destination || null;
  const evidence = { ...request.perceivedTarget, ...(request.predictedVelocity || {}), velocityConfidence: request.velocityConfidence };
  const speed = speedForMode(profile, request.mode);
  const intercept = predictIntercept(origin, evidence, speed, profile.predictionCap);
  const extra = Math.min(profile.predictionCap, Math.max(0, elapsed)) * Math.max(0, Math.min(1, request.velocityConfidence || 0));
  return { x: intercept.x + (evidence.vx || 0) * extra, z: intercept.z + (evidence.vz || 0) * extra };
}
export function ensureRoute(animal, mesh) {
  const request = animal.movementRequest; if (!request) return null;
  const mobilityKey = `${animal.speciesId}:${mobilityStrengthIndex(animal).toFixed(2)}`;
  const changed = !animal.routeState || animal.routeState.requestId !== request.id || animal.routeState.mobilityKey !== mobilityKey || Math.hypot(request.destination.x - animal.routeState.destination.x, request.destination.z - animal.routeState.destination.z) > Math.max(.2, mesh.worldRadius * .35);
  if (!changed && animal.routeState.waypointIndex < animal.routeState.points.length) return animal.routeState;
  const directLocalSteering = request.destinationSource === "player-camera-relative";
  const startId = mesh.polygonAt(animal.locomotion.x, animal.locomotion.z), startPolygon = mesh.polygons?.get(startId), startAssessment = terrainMobilityAssessment(animal, startPolygon || {}), escaping = !startAssessment.allowed;
  const polygonAllowed = polygon => { const assessment = terrainMobilityAssessment(animal, polygon || {}); return polygon?.id === startId || assessment.allowed || escaping && (!polygon?.rocky || assessment.rockPassable) && assessment.slope < startAssessment.slope; };
  const route = request.allowOutsideNavmesh || directLocalSteering ? { polygonIds: [], portals: [], points: [{ ...request.destination }], cost: Math.hypot(request.destination.x - animal.locomotion.x, request.destination.z - animal.locomotion.z) } : findNavPath(mesh, animal.locomotion, request.destination, { polygonAllowed, edgeCost: (edge, _from, to) => edge.cost * terrainMobilityAssessment(animal, to).energyMultiplier });
  const requestChanged = Boolean(animal.routeState && animal.routeState.requestId !== request.id), materiallyMoved = Boolean(animal.routeState && Math.hypot(request.destination.x - animal.routeState.destination.x, request.destination.z - animal.routeState.destination.z) > Math.max(.2, mesh.worldRadius * .35));
  const replanReason = !animal.routeState ? "initial" : requestChanged ? "movement-purpose-changed" : materiallyMoved ? "destination-materially-changed" : animal.routeState.mobilityKey !== mobilityKey ? "mobility-changed" : "route-refresh";
  const routeId = request.routeId || `${request.commitmentId || "unowned"}:${request.targetKey || request.id}`;
  animal.routeState = route ? { routeId, requestId: request.id, mobilityKey, destination: { ...request.destination }, corridor: route.polygonIds, points: route.points, waypointIndex: 0, progress: 0, stalledSubsteps: 0, replanReason } : { routeId, requestId: request.id, mobilityKey, destination: { ...request.destination }, corridor: [], points: [], waypointIndex: 0, progress: 0, stalledSubsteps: 0, replanReason: "no-route" };
  return animal.routeState;
}
export function runLocomotionMinute(animals, mesh, options = {}) {
  const alive = animals.filter((a) => a.alive), elapsed = Math.max(0, options.elapsed == null ? 1 : Number(options.elapsed) || 0), fastest = alive.reduce((value, animal) => Math.max(value, LOCOMOTION_PROFILES[animal.speciesId]?.sprintSpeed || 0), 0), sweptSteps = Math.ceil(fastest * elapsed / Math.max(.08, mesh.worldRadius * .28)), substeps = Math.min(40, Math.max(options.substeps || LOCOMOTION_SUBSTEPS, sweptSteps)), dt = elapsed / substeps;
  if (dt <= 0) { for (const animal of alive) { animal.locomotion ||= createLocomotionState(animal); animal.locomotion.vx = animal.locomotion.vz = animal.locomotion.speed = 0; } return; }
  for (let step = 0; step < substeps; step++) for (const animal of alive) {
    let motionDt = dt;
    const baseProfile = options.profileFor?.(animal) || LOCOMOTION_PROFILES[animal.speciesId], profile = effectiveProfile(animal, baseProfile); animal.locomotion ||= createLocomotionState(animal, profile);
    const request = animal.movementRequest;
    const collisionActor = { ...animal, ...animal.locomotion, bodyRadius: animal.locomotion.collisionRadius }, external = options.neighboursFor?.(animal) || [], candidateRange = Math.max(mesh.worldRadius * 1.4, profile.bodyRadius * 4 + speedForMode(profile, request?.mode) * dt * 2), neighbours = new Map();
    for (const other of [...alive, ...external]) { const state = other.locomotion || other; if (other.id !== animal.id && Math.hypot(state.x - animal.locomotion.x, state.z - animal.locomotion.z) <= candidateRange) neighbours.set(other.id, other); }
    const neighbourStates = [...neighbours.values()].map((o) => ({ ...o, ...(o.locomotion || {}), bodyRadius: o.locomotion?.collisionRadius ?? LOCOMOTION_PROFILES[o.speciesId]?.bodyRadius }));
    if (request) request.destination = predictedRequestDestination(request, animal.locomotion, profile, step * dt) || request.destination;
    const route = ensureRoute(animal, mesh);
    if (!request || !route?.points.length) {
      const separated = resolveAnimalBodyCollision(collisionActor, animal.locomotion, neighbourStates);
      if (separated.collided && bodySupportedByNavmesh(mesh, separated.x, separated.z, bodyRadius(collisionActor))) {
        animal.locomotion = { ...separated, vx: 0, vz: 0, speed: 0, arrivalState: "body-contact" };
        animal.x = animal.fx = separated.x; animal.z = animal.fz = separated.z;
      } else animal.locomotion.vx = animal.locomotion.vz = 0;
      continue;
    }
    if (request.motorDelayHours > 0) {
      const consumed = Math.min(dt, request.motorDelayHours); request.motorDelayHours -= consumed;
      motionDt = Math.max(0, dt - consumed);
      animal.locomotion.vx = animal.locomotion.vz = animal.locomotion.speed = 0;
      animal.locomotion.arrivalState = "motor-latency";
      if (motionDt <= 1e-9) continue;
    }
    animal.locomotion.activeMode = request.mode;
    route.points[route.points.length - 1] = { ...request.destination };
    if (!request.contactTargetId && Math.hypot(request.destination.x - animal.locomotion.x, request.destination.z - animal.locomotion.z) <= Math.max(.1, request.interactionRadius || 0)) {
      animal.locomotion.completedMode = request.mode; animal.locomotion.completedRequestId = request.id; animal.locomotion.completedContactIntent = request.contactIntent ? { ...request.contactIntent } : null; animal.locomotion.activeMode = "idle"; animal.locomotion.arrivalState = "arrived"; animal.movementRequest = null; animal.routeState = null; continue;
    }
    let waypoint = route.points[route.waypointIndex];
    if (Math.hypot(waypoint.x - animal.locomotion.x, waypoint.z - animal.locomotion.z) <= Math.max(.06, mesh.worldRadius * .12) && route.waypointIndex < route.points.length - 1) waypoint = route.points[++route.waypointIndex];
    const separation = softSeparation(collisionActor, neighbourStates, { contactTargetId: request.contactTargetId, range: mesh.worldRadius * .35, weight: profile.separationWeight });
    const before = animal.locomotion, currentPolygon = mesh.polygons?.get(mesh.polygonAt(before.x, before.z)), currentMobility = terrainMobilityAssessment(animal, currentPolygon || {});
    let next = steeringStep(before, waypoint, profile, motionDt, { stoppingRadius: route.waypointIndex === route.points.length - 1 ? request.interactionRadius : 0, maxSpeed: speedForMode(profile, request.mode), separation, terrainSpeed: (options.terrainSpeedAt?.(animal.locomotion.x, animal.locomotion.z, animal) ?? 1) * currentMobility.speedMultiplier, alignmentSlowAngle: options.alignmentSlowAngle });
    // The corridor is authoritative. A feeler that would cross into an
    // impassable polygon is rejected and causes deterministic braking/replan.
    const directLocalSteering = request.destinationSource === "player-camera-relative";
    const polygonAllowed = polygon => { const assessment = terrainMobilityAssessment(animal, polygon || {}); return assessment.allowed || !currentMobility.allowed && (!polygon?.rocky || assessment.rockPassable) && assessment.slope <= currentMobility.slope; };
    const currentBodySupported = bodySupportedByNavmesh(mesh, before.x, before.z, bodyRadius(collisionActor), 10, polygonAllowed);
    const nextBodySupported = bodySupportedByNavmesh(mesh, next.x, next.z, bodyRadius(collisionActor), 10, polygonAllowed);
    // Collision separation can leave the edge of a body's footprint just
    // outside a polygon although its centre is still on valid land. Rejecting
    // every subsequent footprint sample creates an irreversible WASD trap.
    // Direct control may move from that already-unsupported state while its
    // centre remains on the navmesh, allowing the player to steer back inward;
    // a normally supported body still cannot initiate a boundary crossing.
    const nextPolygonId = mesh.polygonAt(next.x, next.z), nextPolygon = nextPolygonId == null ? null : mesh.polygons?.get(nextPolygonId) || { id: nextPolygonId, slope: 0, rocky: false };
    const recoveringDirectBody = directLocalSteering && !currentBodySupported && nextPolygon && polygonAllowed(nextPolygon);
    if (!request.allowOutsideNavmesh && !nextBodySupported && !recoveringDirectBody) { next = { ...before, vx: 0, vz: 0, speed: 0, braking: true, arrived: false, arrivalState: "blocked" }; route.replanReason = "body-clearance"; route.stalledSubsteps += 2; }
    const collisionResolved = resolveAnimalBodyCollision(collisionActor, next, neighbourStates);
    if (collisionResolved.collided) {
      const collisionPolygonId = mesh.polygonAt(collisionResolved.x, collisionResolved.z), collisionPolygon = collisionPolygonId == null ? null : mesh.polygons?.get(collisionPolygonId) || { id: collisionPolygonId, slope: 0, rocky: false };
      const supported = request.allowOutsideNavmesh || bodySupportedByNavmesh(mesh, collisionResolved.x, collisionResolved.z, bodyRadius(collisionActor), 10, polygonAllowed) || (directLocalSteering && !currentBodySupported && collisionPolygon && polygonAllowed(collisionPolygon));
      if (supported) next = { ...collisionResolved, vx: (collisionResolved.x - before.x) / motionDt, vz: (collisionResolved.z - before.z) / motionDt, speed: Math.hypot(collisionResolved.x - before.x, collisionResolved.z - before.z) / motionDt, arrived: false, arrivalState: "body-contact" };
      else next = { ...before, vx: 0, vz: 0, speed: 0, braking: true, arrived: false, arrivalState: "body-blocked" };
    }
    const contactTarget = request.contactTargetId ? options.contactTargetFor?.(request.contactTargetId) : null; let contactReached = false;
    if (contactTarget && request.interactionRadius > 0) {
      const targetState = contactTarget.locomotion || contactTarget, dx = next.x - targetState.x, dz = next.z - targetState.z, centreDistance = Math.hypot(dx, dz);
      if (centreDistance <= request.interactionRadius + .01 && centreDistance > 1e-8) { next.x = targetState.x + dx / centreDistance * request.interactionRadius; next.z = targetState.z + dz / centreDistance * request.interactionRadius; next.vx = next.vz = next.speed = 0; next.arrived = true; next.arrivalState = "contact"; contactReached = true; }
    }
    const progress = Math.hypot(next.x - before.x, next.z - before.z);
    route.stalledSubsteps = progress < .0005 && !next.arrived ? route.stalledSubsteps + 1 : 0;
    route.progress += progress;
    if (route.stalledSubsteps >= substeps * 2) { animal.routeState = null; next.arrivalState = "replanning"; }
    next.distanceTravelled = before.distanceTravelled + Math.hypot(next.x - before.x, next.z - before.z); next.turningEffort = before.turningEffort + Math.abs(next.angularVelocity) * motionDt; animal.locomotion = next;
    animal.x = animal.fx = next.x; animal.z = animal.fz = next.z; animal.orientation = next.heading;
    if (contactReached || (next.arrived && route.waypointIndex === route.points.length - 1)) { next.arrivalState = contactReached ? "contact" : "arrived"; next.completedMode = request.mode; next.completedRequestId = request.id; next.completedContactIntent = request.contactIntent ? { ...request.contactIntent } : null; next.activeMode = "idle"; animal.movementRequest = null; animal.routeState = null; }
  }
}

export function bodySupportedByNavmesh(mesh, x, z, radius, samples = 10, polygonAllowed = null) {
  const supported = (sampleX, sampleZ) => { const id = mesh.polygonAt(sampleX, sampleZ); if (id == null) return false; return !polygonAllowed || polygonAllowed(mesh.polygons?.get(id) || { id, slope: 0, rocky: false }); };
  if (!supported(x, z)) return false;
  const footprint = Math.max(.04, radius * .92);
  for (let index = 0; index < samples; index += 1) {
    const angle = index / samples * Math.PI * 2;
    if (!supported(x + Math.cos(angle) * footprint, z + Math.sin(angle) * footprint)) return false;
  }
  return true;
}
