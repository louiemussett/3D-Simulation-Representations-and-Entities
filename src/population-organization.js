const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const distance = (a, b) => Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0));

export function organizationProfile(species = {}) {
  const diet = species.diet || "omnivore", sociality = clamp(species.herdTendency ?? species.sociality ?? .4, 0, 1);
  return {
    diet, sociality,
    coalitionKind: species.coalitionKind || (diet === "plants" ? "herd" : diet === "meat" ? "pack" : "band"),
    permitsMixedSpecies: species.permitsMixedSpecies ?? diet !== "meat",
    territoriality: clamp(species.territoriality ?? (diet === "meat" ? .72 : diet === "plants" ? .2 : .48), 0, 1),
    territoryRadius: species.territoryRadius || (diet === "meat" ? 14 : diet === "plants" ? 9 : 11)
  };
}

export function largeOrganizationEligible({ population = 0, minimumMembers = 8 } = {}) { return population >= minimumMembers; }

export function buildLargeOrganizations(localGroups = [], speciesById = {}, context = {}) {
  if (!largeOrganizationEligible(context)) return [];
  const range = context.joinRange || Math.max(12, context.worldSize / 14), unclaimed = new Set(localGroups.map((group) => group.id)), organizations = [];
  for (const seed of [...localGroups].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (!unclaimed.has(seed.id)) continue;
    const members = [seed]; unclaimed.delete(seed.id);
    for (const candidate of localGroups) {
      if (!unclaimed.has(candidate.id) || distance(seed.centroid, candidate.centroid) > range || !coalitionCompatible(seed, candidate, speciesById) || !movementAndPurposeCompatible(seed, candidate)) continue;
      members.push(candidate); unclaimed.delete(candidate.id);
    }
    let count = members.reduce((sum, group) => sum + group.count, 0);
    if (members.length < 2 || count < (context.minimumMembers || 8)) continue;
    const individualIds = [], attachedIndividuals = [];
    const preliminary = { x: members.reduce((sum, group) => sum + group.centroid.x * group.count, 0) / count, z: members.reduce((sum, group) => sum + group.centroid.z * group.count, 0) / count };
    for (const individual of context.individuals || []) {
      if (distance(preliminary, individual.centroid) > range || !members.some((group) => coalitionCompatible(group, individual, speciesById) && movementAndPurposeCompatible(group, individual))) continue;
      individualIds.push(individual.id); attachedIndividuals.push(individual); count += 1;
    }
    const constituents = [...members, ...attachedIndividuals];
    const x = constituents.reduce((sum, unit) => sum + unit.centroid.x * unit.count, 0) / count, z = constituents.reduce((sum, unit) => sum + unit.centroid.z * unit.count, 0) / count;
    const speciesIds = [...new Set(members.map((group) => group.speciesId))], migrating = members.filter((group) => ["travelling", "water"].includes(group.goal)).length >= Math.ceil(members.length / 2);
    const profile = organizationProfile(speciesById[speciesIds[0]] || {}), type = migrating ? "migration-group" : speciesIds.length > 1 ? "mixed-herd" : profile.coalitionKind;
    organizations.push({ id: `large-${members.map((group) => group.id).sort()[0]}`, type, groupIds: members.map((group) => group.id), individualIds, speciesIds, count, centroid: { x, z }, goal: migrating ? "migration" : dominantGoal(members) });
  }
  return organizations;
}

function movementAndPurposeCompatible(left, right) {
  const movementA = left.movement || { x: 0, z: 0 }, movementB = right.movement || { x: 0, z: 0 };
  const speedA = Math.hypot(movementA.x, movementA.z), speedB = Math.hypot(movementB.x, movementB.z);
  if (speedA > .04 && speedB > .04 && (movementA.x * movementB.x + movementA.z * movementB.z) / (speedA * speedB) < .35) return false;
  const purpose = (goal) => ["flee / protection", "protection", "defend / rescue"].includes(goal) ? "protection" : ["travelling", "water", "migration"].includes(goal) ? "movement" : ["foraging", "explore"].includes(goal) ? "foraging" : goal || "neutral";
  const a = purpose(left.goal), b = purpose(right.goal);
  return a === b || a === "neutral" || b === "neutral" || [a, b].every((value) => ["movement", "foraging", "protection"].includes(value));
}

export function updateTerritoryClaims(priorClaims = {}, owners = [], speciesById = {}, tick = 0, context = {}) {
  if ((context.worldSize || 0) < 120 || (context.population || 0) < 35) return { claims: {}, disputes: [] };
  const claims = {};
  for (const owner of owners.slice(0, context.maximumClaims || 128)) {
    const profile = organizationProfile(speciesById[owner.speciesId] || {});
    if (profile.territoriality < .35 || owner.count > 1 && owner.type === "migration-group") continue;
    const radius = profile.territoryRadius * (1 + Math.log2(Math.max(1, owner.count)) * .18), previous = priorClaims[owner.id];
    claims[owner.id] = { ownerId: owner.id, speciesId: owner.speciesId, x: owner.centroid.x, z: owner.centroid.z, radius, strength: clamp(profile.territoriality * .55 + Math.log2(Math.max(1, owner.count)) * .12, 0, 1.5), establishedTick: previous?.establishedTick ?? tick, updatedTick: tick };
  }
  const list = Object.values(claims), disputes = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const left = list[i], right = list[j], overlap = left.radius + right.radius - distance(left, right);
    if (overlap <= 0 || left.ownerId === right.ownerId) continue;
    const intensity = clamp(overlap / Math.min(left.radius, right.radius) * Math.min(left.strength, right.strength), 0, 1);
    if (intensity >= .12) disputes.push({ id: [left.ownerId, right.ownerId].sort().join("|"), owners: [left.ownerId, right.ownerId], intensity, x: (left.x + right.x) / 2, z: (left.z + right.z) / 2, tick });
  }
  return { claims, disputes: disputes.sort((a, b) => b.intensity - a.intensity).slice(0, 64) };
}

function coalitionCompatible(left, right, speciesById) {
  if (left.speciesId === right.speciesId) return true;
  const a = organizationProfile(speciesById[left.speciesId] || {}), b = organizationProfile(speciesById[right.speciesId] || {});
  return a.permitsMixedSpecies && b.permitsMixedSpecies && a.diet !== "meat" && b.diet !== "meat";
}

function dominantGoal(groups) {
  const counts = new Map(); for (const group of groups) counts.set(group.goal, (counts.get(group.goal) || 0) + group.count);
  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || "travelling";
}
