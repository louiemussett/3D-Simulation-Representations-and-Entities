import { deepFreeze, stableHash } from "../runtime/immutable.js";

const REQUIRED = ["certificateId", "profileRevision", "registryVersion", "trainingSeedSetHash", "heldOutSeedSetHash", "evaluatedAtUtc", "modelFamilyResults", "documentaryMetrics", "cameraMetrics", "safetyViolations", "approvedCapabilities"];

export function certificatePayload(input = {}) { const { checksum: _checksum, ...payload } = input; return payload; }

export function createValidationCertificate(input = {}) {
  const payload = { ...input, certificateId: input.certificateId || `certificate-${stableHash(input).slice(-12)}`, evaluatedAtUtc: input.evaluatedAtUtc || new Date().toISOString(), safetyViolations: [...(input.safetyViolations || [])], approvedCapabilities: [...new Set(input.approvedCapabilities || [])].sort() };
  for (const field of REQUIRED) if (payload[field] == null) throw new TypeError(`validation certificate missing ${field}`);
  return deepFreeze({ ...payload, checksum: stableHash(payload) });
}

export function validateCertificate(certificate, { profileRevision, registryVersion, requiredCapabilities = [], allowSafetyViolations = false } = {}) {
  const errors = [];
  if (!certificate || typeof certificate !== "object") return { valid: false, errors: ["certificate-missing"] };
  for (const field of REQUIRED) if (certificate[field] == null) errors.push(`missing-${field}`);
  if (certificate.checksum !== stableHash(certificatePayload(certificate))) errors.push("checksum-mismatch");
  if (profileRevision != null && Number(certificate.profileRevision) !== Number(profileRevision)) errors.push("profile-revision-mismatch");
  if (registryVersion != null && Number(certificate.registryVersion) !== Number(registryVersion)) errors.push("registry-version-mismatch");
  if (!certificate.trainingSeedSetHash || !certificate.heldOutSeedSetHash || certificate.trainingSeedSetHash === certificate.heldOutSeedSetHash) errors.push("invalid-seed-partition");
  if (!allowSafetyViolations && certificate.safetyViolations?.length) errors.push("safety-violations-present");
  for (const capability of requiredCapabilities) if (!certificate.approvedCapabilities?.includes(capability)) errors.push(`capability-not-approved:${capability}`);
  return deepFreeze({ valid: !errors.length, errors, certificateId: certificate.certificateId || null });
}
