import { registerBirthKinship } from "./kinship.js";

const youngStage = (animal) => animal.lifeStage === "dependent" || animal.lifeStage === "juvenile";
const adultFemale = (animal) => animal.sex === "F" && ["adult", "old"].includes(animal.lifeStage) && animal.alive !== false;

export function assignStartingCareFamilies(animals = [], speciesById = {}, placeNear = null) {
  const assignments = [];
  for (const speciesId of [...new Set(animals.map((animal) => animal.speciesId))]) {
    const population = animals.filter((animal) => animal.speciesId === speciesId && animal.alive !== false);
    const mothers = population.filter(adultFemale);
    const young = population.filter(youngStage);
    if (!young.length || !mothers.length) continue;
    const loads = new Map(mothers.map((mother) => [mother.id, 0]));
    const rankedMother = (child) => {
      const existing = mothers.find((mother) => mother.id === child.motherId);
      if (existing) return existing;
      return [...mothers].sort((left, right) =>
        Number(Boolean(right.pregnant)) - Number(Boolean(left.pregnant))
        || (loads.get(left.id) || 0) - (loads.get(right.id) || 0)
        || Number(right.careAffinity || 0) - Number(left.careAffinity || 0)
        || left.id.localeCompare(right.id))[0];
    };
    young.forEach((child, index) => {
      const mother = rankedMother(child);
      if (!mother) return;
      loads.set(mother.id, (loads.get(mother.id) || 0) + 1);
      registerBirthKinship(child, mother);
      child.caregiverIds = [...new Set([mother.id, ...(child.caregiverIds || [])])].slice(0, 3);
      mother.offspringIds = [...new Set([...(mother.offspringIds || []), child.id])];
      mother.offspringMemory ||= {};
      mother.offspringMemory[child.id] = { x: child.x, z: child.z, tick: 0, confidence: 1, source: "pre-observation family", lastKnown: { x: child.x, z: child.z }, lastSeenTick: 0, status: child.lifeStage, dependent: child.lifeStage === "dependent" };
      if (child.lifeStage === "dependent") {
        child.dependentUntil = Number(speciesById[speciesId]?.dependency) || child.dependentUntil || child.age;
        mother.lactation = Math.max(Number(mother.lactation) || 0, Math.max(1, child.dependentUntil - Number(child.age || 0)));
      }
      const familyGroup = mother.groupId || `start-family-${speciesId}-${mother.id}`;
      mother.groupId = child.groupId = familyGroup;
      mother.groupLeaderId ||= mother.id;
      child.groupLeaderId = mother.groupLeaderId;
      mother.groupGoal = mother.pregnant ? "pregnancy and family care" : "caregiving";
      child.groupGoal = "remain with caregiver";
      placeNear?.(child, mother, index);
      Object.assign(mother.offspringMemory[child.id], { x: child.x, z: child.z, lastKnown: { x: child.x, z: child.z } });
      child.timeline ||= [];
      child.timeline.push(`observation began beside mother ${mother.id}`);
      mother.timeline ||= [];
      mother.timeline.push(`observation began caring for ${child.id}`);
      assignments.push({ childId: child.id, motherId: mother.id, stage: child.lifeStage, groupId: familyGroup });
    });
  }
  return assignments;
}
