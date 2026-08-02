import { deepFreeze } from "./immutable.js";
import { validateCertificate } from "../learning/validation-certificate.js";

export const LEARNING_LIFECYCLES = Object.freeze(["OBSERVING", "CALIBRATING", "SHADOW_POLICY", "BOUNDED_ACTIVE", "VALIDATED_ACTIVE"]);
const CAPABILITIES = Object.freeze({
  OBSERVING: new Set(["RECORD", "OPEN_FORECAST", "RESOLVE_FORECAST"]),
  CALIBRATING: new Set(["RECORD", "OPEN_FORECAST", "RESOLVE_FORECAST", "MUTATE_CALIBRATION"]),
  SHADOW_POLICY: new Set(["RECORD", "OPEN_FORECAST", "RESOLVE_FORECAST", "MUTATE_CALIBRATION", "PROPOSE_POLICY", "LEARN_EXECUTED_POLICY"]),
  BOUNDED_ACTIVE: new Set(["RECORD", "OPEN_FORECAST", "RESOLVE_FORECAST", "MUTATE_CALIBRATION", "PROPOSE_POLICY", "LEARN_EXECUTED_POLICY", "CONTROL_BOUNDED"]),
  VALIDATED_ACTIVE: new Set(["RECORD", "OPEN_FORECAST", "RESOLVE_FORECAST", "MUTATE_CALIBRATION", "PROPOSE_POLICY", "LEARN_EXECUTED_POLICY", "CONTROL_BOUNDED", "CONTROL_VALIDATED"])
});

export class CapabilityMatrix {
  constructor({ defaultLifecycle = "OBSERVING", families = {}, components = {}, certificate = null, profileRevision = 0, registryVersion = 1 } = {}) {
    this.defaultLifecycle = validLifecycle(defaultLifecycle); this.families = new Map(Object.entries(families)); this.components = new Map(Object.entries(components)); this.certificate = certificate; this.profileRevision = profileRevision; this.registryVersion = registryVersion;
  }
  lifecycle({ family = null, component = null } = {}) { return validLifecycle(component && this.components.get(component) || family && this.families.get(family) || this.defaultLifecycle); }
  allows(capability, context = {}) {
    const lifecycle = this.lifecycle(context); if (!CAPABILITIES[lifecycle]?.has(capability)) return false;
    if (lifecycle !== "VALIDATED_ACTIVE") return true;
    return validateCertificate(this.certificate, { profileRevision: this.profileRevision, registryVersion: this.registryVersion, requiredCapabilities: [capability] }).valid;
  }
  require(capability, context = {}) { if (!this.allows(capability, context)) throw new TypeError(`${capability} is not available for ${context.family || context.component || "default"} in ${this.lifecycle(context)}`); return true; }
  setLifecycle(lifecycle, { family = null, component = null } = {}) { const next = validLifecycle(lifecycle); if (next === "VALIDATED_ACTIVE") this.requireCertificate(["CONTROL_VALIDATED"]); if (family) this.families.set(family, next); else if (component) this.components.set(component, next); else this.defaultLifecycle = next; return next; }
  requireCertificate(capabilities = []) { const result = validateCertificate(this.certificate, { profileRevision: this.profileRevision, registryVersion: this.registryVersion, requiredCapabilities: capabilities }); if (!result.valid) throw new TypeError(`Validation certificate rejected: ${result.errors.join(", ")}`); return true; }
  snapshot() { return deepFreeze({ defaultLifecycle: this.defaultLifecycle, families: Object.fromEntries(this.families), components: Object.fromEntries(this.components), certificate: this.certificate, profileRevision: this.profileRevision, registryVersion: this.registryVersion }); }
}

function validLifecycle(value) { if (!LEARNING_LIFECYCLES.includes(value)) throw new TypeError(`Unknown learning lifecycle: ${value}`); return value; }

export function lifecycleCapabilities(lifecycle) { return new Set(CAPABILITIES[validLifecycle(lifecycle)]); }
