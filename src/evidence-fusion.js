const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const meanAngle = records => { let x = 0, z = 0, weight = 0; for (const record of records) if (Number.isFinite(record.heading)) { const w = record.confidence || .1; x += Math.cos(record.heading) * w; z += Math.sin(record.heading) * w; weight += w; } return weight ? Math.atan2(z, x) : null; };

export const EVIDENCE_FUSION_SCHEMA = 2;

export function traceFreshness(record = {}, context = {}) {
  const age = Math.max(0, Number(record.ageHours || 0)), intensity = clamp(record.intensity), rain = clamp(context.rain || 0), retention = ({ mud: .85, clay: .76, peat: .82, snow: .78, sand: .52, loam: .58, vegetation: .62, rock: .1, water: 0 })[record.substrate] ?? .5;
  const apparentAge = age + rain * (1 - retention) * 5 + (1 - intensity) * 3, uncertaintyHours = .35 + apparentAge * .28 + (1 - intensity) * 2.5;
  return Object.freeze({ band: apparentAge <= 1 ? "very-fresh" : apparentAge <= 4 ? "fresh" : apparentAge <= 12 ? "recent" : "old", estimatedHours: apparentAge, minimumHours: Math.max(0, apparentAge - uncertaintyHours), maximumHours: apparentAge + uncertaintyHours, confidence: clamp(intensity * Math.exp(-apparentAge / 24)), uncertaintyHours });
}

export function traceToSensoryEvidence(observer = {}, record = {}, cell = {}, context = {}) {
  const visible = Boolean(context.visible), withinSmell = Boolean(context.withinSmell), freshness = traceFreshness(record, context), visualKinds = new Set(["footprint", "disturbance", "blood", "water-entry", "water-exit", "dung", "hair", "feather", "shed-antler", "bone", "bedding-site", "rubbing-site", "carcass-fragment"]), smellKinds = new Set(["ground-scent", "blood", "blood-in-water", "urine", "dung", "bedding-site", "rubbing-site", "carcass-fragment"]);
  const visual = visualKinds.has(record.kind) && visible, smelled = smellKinds.has(record.kind) && withinSmell;
  if (!visual && !smelled) return null;
  const base = clamp((record.intensity || 0) * (visual ? .82 : .68) * (.55 + freshness.confidence * .45)), knownSource = context.familiarSourceIds?.has?.(record.sourceId), identifiesSpecies = base >= .62 && Boolean(record.speciesId), identifiesIndividual = base >= .78 && knownSource;
  const threat = context.isThreatSpecies?.(record.speciesId) || false, prey = context.isPreySpecies?.(record.speciesId) || false;
  const structural = ["hair", "feather", "shed-antler", "bone", "carcass-fragment"].includes(record.kind), biologicalDeposit = ["urine", "dung"].includes(record.kind);
  const evidenceChannel = visual ? (record.kind === "blood" ? "visual-blood" : ["footprint"].includes(record.kind) ? "track" : ["disturbance", "bedding-site", "rubbing-site"].includes(record.kind) ? "vegetation-trace" : "sight") : ["blood", "blood-in-water", "carcass-fragment"].includes(record.kind) ? "blood-scent" : record.kind === "ground-scent" ? "ground-scent" : ["urine", "dung"].includes(record.kind) ? "social-scent" : "trace-scent";
  const socialMeaning = ["urine", "dung", "bedding-site", "rubbing-site"].includes(record.kind) && base >= .48 ? { sexClass: record.sexClass || null, reproductiveState: record.kind === "urine" && base >= .68 ? record.reproductiveState || null : null, siteUse: ["bedding-site", "rubbing-site"].includes(record.kind) ? record.kind : null } : null;
  return Object.freeze({ id: `trace:${cell.id}:${record.kind}:${Math.round(freshness.estimatedHours * 10)}`, channel: visual ? "sight" : "smell", evidenceChannel, type: threat ? "predator" : prey ? "preyTrail" : record.kind === "blood" || record.kind === "blood-in-water" ? "injury-trace" : structural ? "physical-remains" : biologicalDeposit ? "biological-deposit" : "movement-trace", traceKind: record.kind, x: Number(record.x ?? cell.x), z: Number(record.z ?? cell.z), confidence: base, uncertainty: 1 + (1 - base) * 3, freshness, age: freshness.estimatedHours, identifiedClass: structural ? "physical-remains" : biologicalDeposit ? "biological-mark" : "movement-evidence", identifiedSpecies: identifiesSpecies ? record.speciesId : null, identifiedIndividual: identifiesIndividual ? record.sourceId : null, possibleIndividual: knownSource && !identifiesIndividual ? record.sourceId : null, identityConfidence: identifiesIndividual ? base : knownSource ? base * .62 : 0, socialMeaning, targetId: identifiesIndividual ? record.sourceId : undefined, heading: Number.isFinite(record.heading) ? record.heading : null, overwritten: Boolean(record.overwrittenBy), substrate: record.substrate || null, evidenceBoundary: "trace-observation-only" });
}

export function buildEvidenceHypotheses(observer = {}, evidence = [], tick = 0) {
  const categories = { prey: [], threat: [] };
  for (const item of evidence) {
    if (item.type === "predator" || item.type === "threat") categories.threat.push(item);
    else if (["preyTrail", "animal", "injury-trace", "movement-trace", "physical-remains", "biological-deposit"].includes(item.type) && observer.canHunt) categories.prey.push(item);
  }
  return Object.freeze(Object.entries(categories).map(([kind, records]) => {
    if (!records.length) return null;
    let x = 0, z = 0, total = 0, complement = 1, freshest = Infinity;
    for (const record of records) { const weight = clamp(record.confidence || 0) * Math.exp(-Math.max(0, Number(record.age || record.freshness?.estimatedHours || 0)) / 18); x += Number(record.x || observer.x) * weight; z += Number(record.z || observer.z) * weight; total += weight; complement *= 1 - clamp(weight * .62); freshest = Math.min(freshest, Number(record.age || record.freshness?.estimatedHours || 0)); }
    const heading = meanAngle(records), confidence = clamp(1 - complement), identityCandidates = [...new Set(records.map(item => item.identifiedSpecies || item.speciesId).filter(Boolean))];
    const siteKinds = [...new Set(records.map(item => item.traceKind).filter(kind => ["bedding-site", "rubbing-site", "carcass-fragment"].includes(kind)))];
    return Object.freeze({ schemaVersion: EVIDENCE_FUSION_SCHEMA, id: `${observer.id}:${kind}:${tick}`, kind, x: total ? x / total : observer.x, z: total ? z / total : observer.z, heading, confidence, freshnessHours: Number.isFinite(freshest) ? freshest : null, identity: identityCandidates.length === 1 && confidence >= .62 ? identityCandidates[0] : null, identityUncertainty: identityCandidates.length !== 1 || confidence < .62, evidenceCount: records.length, evidenceIds: Object.freeze(records.slice(0, 12).map(item => item.id || item.evidenceId || `${item.channel}:${item.type}`)), siteKinds: Object.freeze(siteKinds), ecologicalUse: siteKinds.length ? (kind === "prey" ? "recent-use-area-search" : "recent-threat-use-area") : "movement-corridor", informationBoundary: "observer-evidence-fusion-only" });
  }).filter(Boolean));
}

export function selectTrackingRoute(observer = {}, hypothesis = null, candidates = []) {
  if (!hypothesis || !candidates.length) return Object.freeze({ destination: null, reason: "no evidence-supported route", considered: 0 });
  const desiredHeading = Number.isFinite(hypothesis.heading) ? hypothesis.heading : Math.atan2(hypothesis.z - observer.z, hypothesis.x - observer.x), desiredX = Math.cos(desiredHeading), desiredZ = Math.sin(desiredHeading);
  const eligible = candidates.filter(cell => cell?.known === true && cell.traversable !== false).map(cell => { const dx = cell.x - observer.x, dz = cell.z - observer.z, length = Math.max(.001, Math.hypot(dx, dz)), alignment = (dx / length * desiredX + dz / length * desiredZ + 1) / 2, evidenceSupport = clamp(cell.evidenceSupport || 0), uncertaintyCost = clamp(cell.uncertainty || 0), risk = clamp(cell.risk || 0); return { cell, score: alignment * .5 + evidenceSupport * .36 + hypothesis.confidence * .18 - uncertaintyCost * .2 - risk * .28 }; }).sort((a, b) => b.score - a.score || String(a.cell.id).localeCompare(String(b.cell.id)));
  if (!eligible.length) return Object.freeze({ destination: null, reason: "no known traversable candidate", considered: 0 });
  const best = eligible[0]; return Object.freeze({ destination: Object.freeze({ x: best.cell.x, z: best.cell.z, id: best.cell.id }), reason: `selected from ${eligible.length} locally known routes using fused ${hypothesis.kind} evidence`, considered: eligible.length, score: best.score, informationBoundary: "known-candidates-only" });
}
