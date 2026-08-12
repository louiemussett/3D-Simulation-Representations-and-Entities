import { kinshipBetween } from "./kinship.js";

const SOURCE_ORDER = Object.freeze(["family", "group", "relationship", "memory"]);
const sourceRank = source => SOURCE_ORDER.indexOf(source);
const boundedStrength = value => Math.max(.15, Math.min(1, Number(value) || .45));
const targetId = (record, fallback = null) => String(record?.targetId || record?.partnerId || record?.id || fallback || "").trim();

/** Merge every authoritative and remembered route into one node per entity. */
export function unifiedSocialGraph(subject = {}, context = {}) {
  const animals = Array.isArray(context.animals) ? context.animals : [];
  const lineageRecords = context.lineageRecords || {};
  const worldRelationships = Array.isArray(context.relationships) ? context.relationships : [];
  const livingById = new Map(animals.map(animal => [String(animal.id), animal]));
  const nodes = new Map();
  const add = (rawId, source, kind, strength = .45) => {
    const id = String(rawId || "").trim();
    if (!id || id === String(subject.id)) return;
    const node = nodes.get(id) || { id, sources: new Set(), kinds: new Set(), strengths: {}, related: false };
    node.sources.add(source);
    node.kinds.add(String(kind || source));
    node.strengths[source] = Math.max(node.strengths[source] || 0, boundedStrength(strength));
    if (source === "family") node.related = true;
    nodes.set(id, node);
  };

  const known = new Map(Object.entries(lineageRecords).map(([id, record]) => [String(id), { id, ...(record || {}) }]));
  for (const animal of animals) known.set(String(animal.id), animal);
  for (const candidate of known.values()) {
    if (!candidate?.id || String(candidate.id) === String(subject.id)) continue;
    const relation = kinshipBetween({ ...subject, ancestorDepths: { ...(subject.ancestorDepths || {}) } }, { ...candidate, ancestorDepths: { ...(candidate.ancestorDepths || {}) } });
    if (relation.related) add(candidate.id, "family", relation.kind, relation.direct ? 1 : relation.depth <= 2 ? .88 : .68);
  }
  for (const id of new Set([subject.motherId, subject.fatherId, ...(subject.parentIds || [])].filter(Boolean))) add(id, "family", "parent", 1);
  for (const id of subject.caregiverIds || []) add(id, "family", "caregiver", .9);
  for (const id of subject.offspringIds || []) add(id, "family", "offspring", 1);

  if (subject.groupId) for (const animal of animals) if (animal?.alive && animal.groupId === subject.groupId) add(animal.id, "group", animal.id === subject.groupLeaderId ? "group leader" : "group member", .62);

  for (const relationship of worldRelationships) {
    const sourceId = String(relationship?.sourceId || ""), otherId = sourceId === String(subject.id) ? relationship?.targetId : String(relationship?.targetId || "") === String(subject.id) ? relationship?.sourceId : null;
    if (otherId) add(otherId, "relationship", relationship.type || relationship.kind || "explicit relationship", relationship.strength);
  }
  for (const relationship of subject.relationships || []) add(targetId(relationship), "relationship", relationship.type || relationship.kind || "explicit relationship", relationship.strength ?? relationship.affinity);
  for (const [key, memory] of Object.entries(subject.socialMemory || {})) add(targetId(memory, key), "memory", memory?.kind || memory?.lastEvent || "remembered contact", Math.max(Math.abs(Number(memory?.affinity) || 0), Number(memory?.trust) || 0, Number(memory?.confidence) || 0, .25));

  const result = [...nodes.values()].map(node => {
    const live = livingById.get(node.id), lineage = lineageRecords[node.id];
    const status = live?.alive ? "living" : live?.alive === false || lineage?.deathTick != null ? "deceased" : "memory-only";
    const sources = [...node.sources].sort((left, right) => sourceRank(left) - sourceRank(right));
    const primarySource = sources[0] || "memory", strength = Math.max(...Object.values(node.strengths), .15);
    return Object.freeze({ id: node.id, status, alive: status === "living", sources: Object.freeze(sources), kinds: Object.freeze([...node.kinds]), primarySource, primaryKind: [...node.kinds][0] || primarySource, strength, related: node.related });
  }).sort((left, right) => sourceRank(left.primarySource) - sourceRank(right.primarySource) || Number(right.alive) - Number(left.alive) || right.strength - left.strength || left.id.localeCompare(right.id));
  const count = source => result.filter(node => node.sources.includes(source)).length;
  return Object.freeze({ nodes: Object.freeze(result), counts: Object.freeze({ family: count("family"), group: count("group"), relationship: count("relationship"), memory: count("memory"), deceased: result.filter(node => node.status === "deceased").length, memoryOnly: result.filter(node => node.status === "memory-only").length }) });
}
