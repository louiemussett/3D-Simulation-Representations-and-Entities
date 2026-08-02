const cap = (value, low, high) => Math.max(low, Math.min(high, value));
export const GROUP_NAMING_SCHEMA = 2;

export function describeGroup(members = [], context = {}) {
  const adults = members.filter((member) => ["adult", "old"].includes(member.lifeStage));
  const females = adults.filter((member) => member.sex === "F"), males = adults.filter((member) => member.sex === "M");
  const dependents = members.filter((member) => member.lifeStage === "dependent");
  const goal = context.goal || members[0]?.groupGoal || "travelling", speciesId = members[0]?.speciesId || "grazer";
  const centroid = members.reduce((sum, member) => ({ x: sum.x + (member.x || 0), z: sum.z + (member.z || 0) }), { x: 0, z: 0 });
  centroid.x /= Math.max(1, members.length); centroid.z /= Math.max(1, members.length);
  let type = sizeBasedType(members.length, speciesId), focalId = null;
  if (hasFamilyStructure(members) || dependents.length && dependents.length >= Math.max(1, Math.floor(members.length / 3))) type = "family";
  else if (goal === "mates" && females.length >= 2 && males.length >= 1) { type = "courtship-circle"; focalId = bestFocalMale(males, females); }
  else if (goal === "mates" && males.length >= 2 && females.length >= 1) { type = "pursuit-group"; focalId = females[0].id; }
  else if (["hunting", "carcass hunt"].includes(goal) && members.length >= 2) type = "hunting-party";
  return { type, focalId, goal, speciesId, count: members.length, centroid, region: regionName(centroid, context.worldHalf || 45) };
}

export function updateGroupIdentity(registry = {}, groupId, description, tick, options = {}) {
  const renameAfter = options.renameAfter ?? 60, historyLimit = options.historyLimit ?? 8;
  const proposedName = composeGroupName(description), prior = registry[groupId];
  if (!prior) {
    registry[groupId] = { schema: GROUP_NAMING_SCHEMA, id: groupId, currentName: proposedName, type: description.type, reason: description.goal, namedAt: tick, lastSeenTick: tick, nameHistory: [] };
    return registry[groupId];
  }
  prior.lastSeenTick = tick;
  const schemaChanged = prior.schema !== GROUP_NAMING_SCHEMA;
  if (proposedName !== prior.currentName && (schemaChanged || tick - (prior.namedAt || 0) >= renameAfter)) {
    prior.nameHistory ||= [];
    prior.nameHistory.push({ name: prior.currentName, type: prior.type, fromTick: prior.namedAt || 0, toTick: tick, reason: prior.reason });
    prior.nameHistory = prior.nameHistory.slice(-historyLimit);
    prior.currentName = proposedName; prior.type = description.type; prior.reason = description.goal; prior.namedAt = tick;
  }
  prior.schema = GROUP_NAMING_SCHEMA;
  return prior;
}

export function groupDisplayName(registry, groupId) { return registry?.[groupId]?.currentName || groupId; }

/**
 * A social group requires at least two living members. A dependent may retain
 * its kinship and caregiver links after separation, but it must not retain a
 * one-member Pair, Family, Pack or Herd identity.
 */
export function dissolveSingletonGroups(animals = [], tick = 0) {
  const living = animals.filter(animal => animal?.alive !== false), counts = new Map();
  for (const animal of living) if (animal.groupId) counts.set(animal.groupId, (counts.get(animal.groupId) || 0) + 1);
  const dissolved = new Set();
  for (const animal of living) {
    const groupId = animal.groupId;
    if (!groupId || (counts.get(groupId) || 0) >= 2) continue;
    animal.groupHistory ||= [];
    animal.groupHistory.push({ groupId, endedAt: tick, reason: "insufficient-living-members" });
    animal.groupHistory = animal.groupHistory.slice(-8);
    animal.groupId = null; animal.groupGoal = null; animal.groupLeaderId = null; animal.groupDisplayName = null;
    dissolved.add(groupId);
  }
  return [...dissolved];
}

export function composeGroupName(description) {
  const region = description.region || "Central";
  if (description.type === "courtship-circle" && description.focalId) return `${description.focalId}'s Court`;
  if (description.type === "pursuit-group" && description.focalId) return `${description.focalId} Pursuit Group`;
  const suffix = ({ pair: "Pair", family: "Family", "small-group": "Small Group", "hunting-party": "Hunting Party", pack: "Pack", herd: "Herd", band: "Band", gathering: "Gathering", "migration-group": "Migration Group", "mixed-herd": "Mixed Herd" })[description.type] || "Group";
  return `${region} ${suffix}`;
}

function sizeBasedType(count, speciesId) {
  if (count <= 2) return "pair";
  if (count <= 5) return "small-group";
  if (speciesId === "hunter") return count >= 5 ? "pack" : "small-group";
  if (count <= 11) return "band";
  return "herd";
}

function hasFamilyStructure(members) {
  const ids = new Set(members.map((member) => member.id));
  return members.some((member) => member.motherId && ids.has(member.motherId) || (member.offspringIds || []).some((id) => ids.has(id)));
}

function bestFocalMale(males, females) {
  return [...males].sort((left, right) => {
    const reputation = (male) => females.reduce((sum, female) => sum + (female.femaleMateGraph?.[male.id]?.alignment || 0), 0);
    return reputation(right) - reputation(left) || String(left.id).localeCompare(String(right.id));
  })[0]?.id || null;
}

function regionName(point, half) {
  const x = cap(point.x / Math.max(1, half), -1, 1), z = cap(point.z / Math.max(1, half), -1, 1);
  if (Math.hypot(x, z) < .28) return "Central";
  const vertical = z < -.2 ? "North" : z > .2 ? "South" : "";
  const horizontal = x < -.2 ? "West" : x > .2 ? "East" : "";
  return `${vertical}${horizontal}` || "Central";
}
