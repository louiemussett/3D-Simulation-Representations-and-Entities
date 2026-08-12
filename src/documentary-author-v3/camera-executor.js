const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const axis = (current, target, velocity, dt, limits) => { const error = target - current, direction = Math.sign(error), stoppingVelocity = direction * Math.sqrt(Math.max(0, 2 * limits.maximumAcceleration * Math.abs(error))) * .75, desiredVelocity = direction * Math.min(limits.maximumSpeed, Math.abs(error) * limits.response, Math.abs(stoppingVelocity)), acceleration = clamp((desiredVelocity - velocity) / Math.max(.001, dt), -limits.maximumAcceleration, limits.maximumAcceleration), nextVelocity = velocity + acceleration * dt, next = current + nextVelocity * dt; return Math.sign(target - current) !== Math.sign(target - next) ? { value: target, velocity: 0, acceleration: 0, crossed: true } : { value: next, velocity: nextVelocity, acceleration, crossed: false }; };

export class ConvergentCameraExecutor {
  constructor({ maximumSpeed = 18, maximumAcceleration = 28, maximumJerk = 80, response = 2.8 } = {}) { this.limits = { maximumSpeed, maximumAcceleration, maximumJerk, response }; this.state = null; }
  setLimits(limits = {}) {
    this.limits = {
      maximumSpeed: clamp(finite(limits.maximumSpeed, this.limits.maximumSpeed), .25, 80),
      maximumAcceleration: clamp(finite(limits.maximumAcceleration, this.limits.maximumAcceleration), .25, 160),
      maximumJerk: clamp(finite(limits.maximumJerk, this.limits.maximumJerk), .25, 400),
      response: clamp(finite(limits.response, this.limits.response), .2, 12)
    };
    return { ...this.limits };
  }
  reset(pose) { this.state = { position: { ...pose.position }, target: { ...pose.target }, fov: finite(pose.fov, 45), velocity: { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, fov: 0 }, acceleration: { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, fov: 0 }, settled: {} }; return this.state; }
  update(desired, dtSeconds) {
    const dt = clamp(finite(dtSeconds, 1 / 60), 1 / 240, .1); if (!this.state) this.reset(desired); const next = { position: {}, target: {}, velocity: {}, acceleration: {}, settled: {}, fov: this.state.fov };
    for (const [key, output, velocityKey] of [["position", next.position, ""], ["target", next.target, "t"]]) {
      const components = ["x", "y", "z"], requested = {}, priorAcceleration = {}, wanted = {};
      for (const component of components) { const id = `${velocityKey}${component}`; wanted[component] = finite(desired[key]?.[component], this.state[key][component]); const raw = axis(this.state[key][component], wanted[component], this.state.velocity[id] || 0, dt, this.limits); priorAcceleration[component] = this.state.acceleration[id] || 0; requested[component] = raw.acceleration; }
      let deltas = Object.fromEntries(components.map(component => [component, requested[component] - priorAcceleration[component]])), deltaMagnitude = Math.hypot(...components.map(component => deltas[component])), maximumDelta = this.limits.maximumJerk * dt; if (deltaMagnitude > maximumDelta) for (const component of components) deltas[component] *= maximumDelta / deltaMagnitude;
      let accelerations = Object.fromEntries(components.map(component => [component, priorAcceleration[component] + deltas[component]])), accelerationMagnitude = Math.hypot(...components.map(component => accelerations[component])); if (accelerationMagnitude > this.limits.maximumAcceleration) for (const component of components) accelerations[component] *= this.limits.maximumAcceleration / accelerationMagnitude;
      for (const component of components) { const id = `${velocityKey}${component}`, remainsSettled = this.state.settled?.[id] && Math.abs(wanted[component] - this.state[key][component]) < 1e-9, velocity = remainsSettled ? 0 : clamp(this.state.velocity[id] + accelerations[component] * dt, -this.limits.maximumSpeed, this.limits.maximumSpeed), proposed = this.state[key][component] + velocity * dt, crossed = !remainsSettled && Math.sign(wanted[component] - this.state[key][component]) !== Math.sign(wanted[component] - proposed); output[component] = remainsSettled || crossed ? wanted[component] : proposed; next.velocity[id] = remainsSettled || crossed ? 0 : velocity; next.acceleration[id] = accelerations[component]; next.settled[id] = remainsSettled || crossed; }
    }
    const fovResult = axis(this.state.fov, finite(desired.fov, this.state.fov), this.state.velocity.fov || 0, dt, { ...this.limits, maximumSpeed: 20, maximumAcceleration: 35 }); next.fov = fovResult.value; next.velocity.fov = fovResult.velocity; next.acceleration.fov = fovResult.acceleration; this.state = next; return next;
  }
}
