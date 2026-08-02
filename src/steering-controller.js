const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const wrapAngle = (v) => Math.atan2(Math.sin(v), Math.cos(v));
export const shortestAngle = (from, to) => wrapAngle(to - from);
export const brakingDistance = (speed, braking) => speed * speed / (2 * Math.max(.0001, braking));
export const moveTowards = (value, target, delta) => value < target ? Math.min(target, value + delta) : Math.max(target, value - delta);

export function predictIntercept(origin, evidence, speed, cap = 2) {
  const dx = evidence.x - origin.x, dz = evidence.z - origin.z;
  const lead = clamp(Math.hypot(dx, dz) / Math.max(.01, speed), 0, cap) * clamp(evidence.velocityConfidence ?? evidence.confidence ?? 0, 0, 1);
  return { x: evidence.x + (evidence.vx || 0) * lead, z: evidence.z + (evidence.vz || 0) * lead, lead };
}

export function steeringStep(state, target, profile, dt, options = {}) {
  const dx = target.x - state.x, dz = target.z - state.z, distance = Math.hypot(dx, dz);
  const stop = Math.max(0, options.stoppingRadius ?? 0), remaining = Math.max(0, distance - stop);
  const desiredHeading = distance > .00001 ? Math.atan2(dz, dx) : state.heading;
  const turn = shortestAngle(state.heading, desiredHeading);
  const speed = Math.hypot(state.vx || 0, state.vz || 0);
  const turnRate = Math.max(.01, typeof profile.turnRate === "function" ? profile.turnRate(speed) : profile.turnRate ?? Math.PI);
  const heading = wrapAngle(state.heading + clamp(turn, -turnRate * dt, turnRate * dt));
  const alignment = clamp(1 - Math.abs(turn) / Math.max(.001, options.alignmentSlowAngle ?? Math.PI * .65), 0, 1);
  const maxSpeed = Math.max(0, (options.maxSpeed ?? profile.maxSpeed ?? 1) * (options.terrainSpeed ?? 1));
  const arrivalSpeed = Math.sqrt(2 * Math.max(.001, profile.braking ?? 1) * remaining);
  let desiredSpeed = Math.min(maxSpeed * (.12 + .88 * alignment), arrivalSpeed);
  if (remaining <= .001 || (distance > 0 && speed * dt >= remaining && speed > desiredSpeed)) desiredSpeed = 0;
  const nextSpeed = moveTowards(speed, desiredSpeed, (desiredSpeed < speed ? profile.braking : profile.acceleration) * dt);
  const separation = options.separation || { x: 0, z: 0 };
  let hx = Math.cos(heading) + separation.x, hz = Math.sin(heading) + separation.z;
  const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
  let travel = Math.min(nextSpeed * dt, remaining), x = state.x + hx * travel, z = state.z + hz * travel;
  if (remaining <= .001) { x = state.x; z = state.z; travel = 0; }
  return { ...state, x, z, heading, angularVelocity: shortestAngle(state.heading, heading) / dt, vx: hx * (travel / dt), vz: hz * (travel / dt), speed: travel / dt, distance, remaining, arrived: remaining <= .001, braking: desiredSpeed < speed, alignment };
}
