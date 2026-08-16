export const THERMAL_PROFILES = Object.freeze({
  grazer: Object.freeze({ setPoint: 38.6, comfortableLow: 37.6, comfortableHigh: 39.4, inertia: .78 }),
  hunter: Object.freeze({ setPoint: 38.2, comfortableLow: 37.2, comfortableHigh: 39.1, inertia: .84 })
});
import { SPECIES, eatsMeat } from "./species-registry.js";
import { biologicalPhenotype, thermalPerformance } from "./biological-phenotypes.js";

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const thermalProfile = (speciesId) => {
  const phenotype = biologicalPhenotype(speciesId)?.thermoregulation, base = THERMAL_PROFILES[speciesId] || THERMAL_PROFILES[eatsMeat(speciesId) ? "hunter" : "grazer"];
  if (phenotype?.strategy === "ectotherm") return { setPoint: 27, comfortableLow: 19 - (phenotype.coldTolerance || .5) * 4, comfortableHigh: 32 + (phenotype.heatTolerance || .5) * 3, inertia: .18, strategy: "ectotherm" };
  return { ...base, comfortableLow: base.comfortableLow - Math.max(0, (phenotype?.coldTolerance || .5) - .5) * 1.5, comfortableHigh: base.comfortableHigh + Math.max(0, (phenotype?.heatTolerance || .5) - .5) * 1.5, inertia: clamp(base.inertia + ((phenotype?.insulation || .5) - .5) * .08, .65, .94), strategy: phenotype?.strategy || "endotherm" };
};
export { thermalProfile };
export function initialBodyTemperature(speciesId) { return thermalProfile(speciesId).setPoint; }

export function thermalStatus(speciesId, bodyTemperature) {
  const profile = thermalProfile(speciesId);
  if (bodyTemperature >= profile.comfortableHigh + 1.5) return "dangerously-hot";
  if (bodyTemperature > profile.comfortableHigh) return "hot";
  if (bodyTemperature <= profile.comfortableLow - 1.5) return "dangerously-cold";
  if (bodyTemperature < profile.comfortableLow) return "cold";
  return "comfortable";
}

export function thermalDrive(speciesId, bodyTemperature) {
  const profile = thermalProfile(speciesId);
  const hot = Math.max(0, bodyTemperature - profile.comfortableHigh), cold = Math.max(0, profile.comfortableLow - bodyTemperature);
  return { hot: clamp(hot * 38, 0, 100), cold: clamp(cold * 38, 0, 100), status: thermalStatus(speciesId, bodyTemperature) };
}

export function updateThermalExposure(speciesId, bodyTemperature, previousHours = 0, elapsedHours = 1) {
  const drive = thermalDrive(speciesId, bodyTemperature), status = drive.status;
  const dangerous = status === "dangerously-hot" || status === "dangerously-cold";
  if (!dangerous) return { exposureHours: Math.max(0, previousHours - elapsedHours * (status === "comfortable" ? 2 : .5)), healthDamage: 0, cause: null };
  const exposureHours = Math.max(0, previousHours) + elapsedHours;
  const damagingFraction = clamp(exposureHours - 3, 0, elapsedHours);
  const stress = Math.max(drive.hot, drive.cold);
  const healthDamage = Math.max(0, stress - 55) * .12 * damagingFraction;
  return { exposureHours, healthDamage, cause: status === "dangerously-hot" ? "heat stress" : "cold stress" };
}

export function terrainThermalEffect(cell = {}, nearbyWater = false) {
  let effect = 0;
  if (cell.terrainClass === "snow" || (cell.snowPack || 0) > .12) effect -= .32;
  if (cell.woodland || cell.terrainClass === "forest") effect -= .16;
  if (cell.wetland || cell.landCover === "swamp") effect -= .11;
  if ((cell.waterDepth || 0) > 0 && (cell.waterDepth || 0) <= .45) effect -= .34;
  if (nearbyWater && !(cell.waterDepth > 0)) effect -= .07;
  if (cell.sandy || (cell.terrainClass === "dirt" && (cell.temperature || 0) >= 28)) effect += .28;
  return effect;
}

export function updateBodyTemperature(animal, environment = {}) {
  const profile = thermalProfile(animal.speciesId);
  const current = Number.isFinite(animal.bodyTemperature) ? animal.bodyTemperature : profile.setPoint;
  const ambient = Number.isFinite(environment.ambientTemperature) ? environment.ambientTemperature : 18;
  const sources = {
    ambient: clamp((ambient - 18) * .018, -.34, .38), terrain: terrainThermalEffect(environment.cell, environment.nearbyWater),
    movement: clamp(Number(environment.movementIntensity) || 0, 0, 1.5) * .18,
    digestion: clamp(Number(animal.digestiveHeat) / 200 || 0, 0, .35),
    drinking: environment.drinking ? -.28 : 0, mating: environment.mating ? .22 : 0,
    proximity: Math.min(4, Math.max(0, environment.nearbyAnimals || 0)) * .025,
    surrounded: (environment.nearbyAnimals || 0) >= 5 ? .18 + Math.min(.18, ((environment.nearbyAnimals || 0) - 5) * .02) : 0
  };
  const external = Object.values(sources).reduce((sum, value) => sum + value, 0);
  const targetTemperature = profile.strategy === "ectotherm" ? clamp(ambient + 7 + terrainThermalEffect(environment.cell, environment.nearbyWater) * 8, 12, 38) : profile.setPoint;
  const regulation = clamp((targetTemperature - current) * (1 - profile.inertia), profile.strategy === "ectotherm" ? -1.2 : -.42, profile.strategy === "ectotherm" ? 1.2 : .42);
  const elapsedHours = Math.max(0, Number(environment.elapsedHours) || 1);
  const bodyTemperature = clamp(current + (external + regulation) * elapsedHours, 32, 44), drive = thermalDrive(animal.speciesId, bodyTemperature);
  return { bodyTemperature, tempStress: Math.max(drive.hot, drive.cold), thermalStatus: drive.status, thermalPerformance: thermalPerformance(animal, clamp((bodyTemperature - 10) / 30, 0, 1)), sources };
}

export function migrateTemperatureState(animal) {
  if (!Number.isFinite(animal.bodyTemperature)) animal.bodyTemperature = initialBodyTemperature(animal.speciesId);
  const drive = thermalDrive(animal.speciesId, animal.bodyTemperature);
  animal.tempStress = Number.isFinite(animal.tempStress) ? clamp(animal.tempStress, 0, 100) : Math.max(drive.hot, drive.cold);
  animal.thermalStatus = drive.status; animal.thermalSources ||= {}; animal.thermalExposureHours = Number.isFinite(animal.thermalExposureHours) ? Math.max(0, animal.thermalExposureHours) : 0; return animal;
}
