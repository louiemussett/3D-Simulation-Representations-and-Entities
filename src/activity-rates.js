export const ACTIVITY_COMMIT_TICKS = Object.freeze({ feeding: 18, carcassFeeding: 16, rest: 12, digestion: 10 });

// Approximate dry-matter intake while actively feeding. Herbivores cannot share
// one absolute bite rate: a four-kilogram nibbler and a five-hundred-kilogram
// browser have radically different maintenance requirements. The coefficient
// yields about 2.5% of body mass across ten active feeding hours, with slower
// selective browsing than grass grazing.
export function forageBite(plantKind, bodyMass = 16) {
  const hourlyDryMatter = Math.max(.008, Math.max(.5, Number(bodyMass) || 16) * .0025) * (plantKind === "shrub" ? .75 : 1);
  return hourlyDryMatter / 60;
}
export function carcassMeal(bodyMass = 0) { return Math.max(.6, Math.max(0, bodyMass) * .045) / 60; }
export function digestionRate(speciesId, stomach = 0) {
  const base = stomach >= 94 ? .2 : stomach >= 82 ? .27 : stomach >= 68 ? .34 : .43;
  return base * (speciesId === "hunter" ? .45 : 1);
}
export function carnivoreActivityMode(ecologicalHour, decisionOrder = 0, hunger = 0) {
  if (hunger >= 35) return "hunt";
  const hour = ((Math.floor(ecologicalHour) + Math.floor(decisionOrder) * 7) % 24 + 24) % 24;
  return hour < 4 || (hour >= 16 && hour < 20) ? "patrol" : "conserve";
}
export function passiveFatigueRecovery() { return .2; }

// Aerobic walking is sustainable background activity; it must not accumulate
// fatigue at the same rate as a chase. Values scale the locomotion load after
// terrain and species endurance have been applied.
export function locomotionFatigueScale(mode = "walk", climbing = false) {
  if (mode === "sprint") return 1;
  if (climbing) return .42;
  if (mode === "stalk") return .28;
  return .18;
}

export function restRecovery({ severeTrauma = false, sheltered = false, stomach = 0, healthCap = 100 } = {}) {
  const fatigue = severeTrauma ? .9 : sheltered ? 2.4 : 1.6;
  const energy = sheltered && stomach > 20 ? .16 + Math.min(.24, stomach / 320) : 0;
  const health = severeTrauma ? .08 : healthCap <= 75 ? .16 : .22;
  return { fatigue, energy, health };
}

export function seedChanceForBite(bite, referenceBite = .16, referenceChance = .35) {
  if (bite <= 0) return 0;
  return 1 - Math.pow(1 - referenceChance, bite / referenceBite);
}
