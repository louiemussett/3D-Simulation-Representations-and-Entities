import { findNavPath } from "./navmesh-pathfinding.js";
import { bodyRadius, collisionRadiusFor, resolveAnimalBodyCollision, softSeparation } from "./interaction-spacing.js";
import { predictIntercept, steeringStep } from "./steering-controller.js";
import { SPECIES, SPECIES_IDS, eatsMeat } from "./species-registry.js";
import { biologicalPhenotype } from "./biological-phenotypes.js";
import { mobilityStrengthIndex, terrainMobilityAssessment } from "./terrain-mobility.js";
export const LOCOMOTION_SUBSTEPS = 8;
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
export function createMovementRequest(id, destination, options = {}) { return { id, destination: { x: destination.x, z: destination.z }, destinationSource: options.destinationSource || "world", allowOutsideNavmesh: Boolean(options.allowOutsideNavmesh), perceivedTarget: options.perceivedTarget || null, observationId: options.observationId || options.perceivedTarget?.evidenceId || null, observationTick: options.observationTick ?? options.perceivedTarget?.observedTick ?? null, predictedVelocity: options.predictedVelocity || (options.perceivedTarget ? { vx: options.perceivedTarget.vx || 0, vz: options.perceivedTarget.vz || 0 } : null), velocityConfidence: options.velocityConfidence ?? options.perceivedTarget?.velocityConfidence ?? 0, interactionRadius: options.interactionRadius || 0, urgency: options.urgency || 0, mode: options.mode || "walk", completionCondition: options.completionCondition || "arrival", contactTargetId: options.contactTargetId || null, contactIntent: options.contactIntent || null }; }
function speedForMode(profile, mode) { if (mode === "sprint") return profile.sprintSpeed; if (mode === "run") return Math.min(profile.sprintSpeed * .78, profile.maxSpeed * 1.34); if (mode === "stalk") return profile.maxSpeed * .58; return profile.maxSpeed; }
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
  animal.routeState = route ? { requestId: request.id, mobilityKey, destination: { ...request.destination }, corridor: route.polygonIds, points: route.points, waypointIndex: 0, progress: 0, stalledSubsteps: 0, replanReason: changed ? "destination-changed" : "initial" } : { requestId: request.id, mobilityKey, destination: { ...request.destination }, corridor: [], points: [], waypointIndex: 0, progress: 0, stalledSubsteps: 0, replanReason: "no-route" };
  return animal.routeState;
}
export function runLocomotionMinute(animals, mesh, options = {}) {
  const alive = animals.filter((a) => a.alive), substeps = options.substeps || LOCOMOTION_SUBSTEPS, elapsed = Math.max(0, options.elapsed == null ? 1 : Number(options.elapsed) || 0), dt = elapsed / substeps;
  for (let step = 0; step < substeps; step++) for (const animal of alive) {
    const profile = options.profileFor?.(animal) || LOCOMOTION_PROFILES[animal.speciesId]; animal.locomotion ||= createLocomotionState(animal, profile);
    const request = animal.movementRequest;
    const neighbours = options.neighboursFor?.(animal) || alive, collisionActor = { ...animal, ...animal.locomotion, bodyRadius: animal.locomotion.collisionRadius }, neighbourStates = neighbours.map((o) => ({ ...o, ...(o.locomotion || {}), bodyRadius: o.locomotion?.collisionRadius ?? LOCOMOTION_PROFILES[o.speciesId]?.bodyRadius }));
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
    animal.locomotion.activeMode = request.mode;
    route.points[route.points.length - 1] = { ...request.destination };
    let waypoint = route.points[route.waypointIndex];
    if (Math.hypot(waypoint.x - animal.locomotion.x, waypoint.z - animal.locomotion.z) <= Math.max(.06, mesh.worldRadius * .12) && route.waypointIndex < route.points.length - 1) waypoint = route.points[++route.waypointIndex];
    const separation = softSeparation(collisionActor, neighbourStates, { contactTargetId: request.contactTargetId, range: mesh.worldRadius * .35, weight: profile.separationWeight });
    const before = animal.locomotion, currentPolygon = mesh.polygons?.get(mesh.polygonAt(before.x, before.z)), currentMobility = terrainMobilityAssessment(animal, currentPolygon || {});
    let next = steeringStep(before, waypoint, profile, dt, { stoppingRadius: route.waypointIndex === route.points.length - 1 ? request.interactionRadius : 0, maxSpeed: speedForMode(profile, request.mode), separation, terrainSpeed: (options.terrainSpeedAt?.(animal.locomotion.x, animal.locomotion.z, animal) ?? 1) * currentMobility.speedMultiplier, alignmentSlowAngle: options.alignmentSlowAngle });
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
      if (supported) next = { ...collisionResolved, vx: (collisionResolved.x - before.x) / dt, vz: (collisionResolved.z - before.z) / dt, speed: Math.hypot(collisionResolved.x - before.x, collisionResolved.z - before.z) / dt, arrived: false, arrivalState: "body-contact" };
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
    next.distanceTravelled = before.distanceTravelled + Math.hypot(next.x - before.x, next.z - before.z); next.turningEffort = before.turningEffort + Math.abs(next.angularVelocity) * dt; animal.locomotion = next;
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
