import { policyAllowsClaim } from "../planning/policy-compiler.js";
import { deepFreeze } from "../runtime/immutable.js";

export function validatePresentationContract(contract, { propositions, evidence, policy, tick = Infinity } = {}) {
  const errors = [], warnings = [];
  if (!contract) return deepFreeze({ valid: false, errors: ["contract-missing"], warnings });
  if (!contract.decision?.decisionId) errors.push("decision-id-missing");
  if (!contract.situationId) errors.push("situation-id-missing");
  if (!contract.threadId) errors.push("thread-id-missing");
  const subjectIds = new Set(contract.subjectIds || []), cameraIds = new Set([...(contract.camera?.primarySubjects || []), ...(contract.camera?.secondarySubjects || [])]), narrationIds = new Set(contract.narration?.subjectIds || []);
  for (const id of cameraIds) if (!subjectIds.has(id)) errors.push(`camera-subject-unlicensed:${id}`);
  for (const id of narrationIds) if (!subjectIds.has(id)) errors.push(`narration-subject-unlicensed:${id}`);
  if (contract.narration?.mode === "SPEAK" && !contract.allowedClaimIds?.length) errors.push("spoken-contract-has-no-claims");
  if (contract.narration?.mode === "SILENCE" && contract.narration?.allowedClaimIds?.length) warnings.push("silent-contract-carries-claims");
  for (const claimId of contract.allowedClaimIds || []) {
    const claim = propositions?.get?.(claimId); if (!claim) { errors.push(`claim-missing:${claimId}`); continue; }
    if (!propositions.valid?.(claimId, tick)) errors.push(`claim-invalid:${claimId}`);
    const policyResult = policyAllowsClaim(claim, policy); if (!policyResult.allowed) errors.push(`claim-policy-rejected:${claimId}:${policyResult.reason}`);
    for (const evidenceId of claim.evidenceIds || []) if (!evidence?.get?.(evidenceId)) errors.push(`evidence-missing:${evidenceId}`);
  }
  if (!(contract.camera?.preferredFamilies || []).every(family => contract.camera?.allowedFamilies?.includes(family))) errors.push("preferred-camera-family-not-allowed");
  if (contract.camera?.minimumHoldSeconds > contract.camera?.preferredHoldSeconds) errors.push("camera-hold-bounds-inverted");
  return deepFreeze({ valid: !errors.length, errors: [...new Set(errors)], warnings: [...new Set(warnings)] });
}

export function assertPresentationContract(contract, context) { const result = validatePresentationContract(contract, context); if (!result.valid) throw new TypeError(`Invalid presentation contract: ${result.errors.join(", ")}`); return result; }
