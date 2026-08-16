const FORBIDDEN = Object.freeze(["health", "energy", "privateTargetId", "decisionState", "sensorDefinitions", "sensorAnchors", "visionCone", "authoritativeAttention"]);
export function evidenceBoundaryViolations(value = {}) { return Object.freeze(FORBIDDEN.filter(key => Object.hasOwn(value, key))); }
export function assertObserverOwnedEvidence(value = {}, label = "observer evidence") { const violations = evidenceBoundaryViolations(value); if (violations.length) throw new TypeError(`${label} contains authoritative/private fields: ${violations.join(", ")}`); return value; }
export const EVIDENCE_BOUNDARY_FORBIDDEN_FIELDS = FORBIDDEN;
