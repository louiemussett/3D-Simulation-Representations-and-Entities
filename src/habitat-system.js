const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
const mix = (a, b, amount) => Math.round(a + (b - a) * clamp(amount));
const band = (value, count) => Math.min(count - 1, Math.max(0, Math.floor(clamp(value) * count)));

export const HABITAT_DENSITY_BANDS = 8;
export const HABITAT_HUMIDITY_BANDS = Object.freeze(["parched", "dry", "moderate", "humid", "saturated"]);
export const HABITAT_TEMPERATURE_BANDS = Object.freeze(["freezing", "cold", "mild", "warm", "hot"]);

const HABITAT_LABELS = Object.freeze({
  "open-water": "open water", marsh: "marsh", "wet-meadow": "wet meadow", "shrub-swamp": "shrub swamp", "wooded-swamp": "wooded swamp",
  "humid-tropical-forest": "humid tropical forest", "temperate-forest": "temperate forest", "boreal-forest": "boreal forest", "dry-forest": "dry forest",
  "open-woodland": "open woodland", savanna: "savanna", "riparian-woodland": "riparian woodland", shrubland: "shrubland", "thorn-scrub": "thorn scrub",
  "cold-scrub": "cold scrub", "riparian-thicket": "riparian thicket", "tall-grassland": "tall grassland", "short-grassland": "short grassland",
  "dry-grassland": "dry grassland", "cold-grassland": "cold grassland", "hot-desert": "hot desert", "cold-desert": "cold desert", tundra: "tundra",
  "bare-ground": "bare ground", rock: "rock", snow: "snow"
});

function normalizedGroundwater(cell) {
  const value = Number(cell.groundwater) || 0;
  return clamp(value > 1 ? value / 120 : value / .8);
}

function temperatureBand(temperature) {
  if (temperature < -2) return 0;
  if (temperature < 8) return 1;
  if (temperature < 20) return 2;
  if (temperature < 30) return 3;
  return 4;
}

function plantCommunity(cell, habitatType, temperature, waterAvailability) {
  if (habitatType === "open-water") return "aquatic";
  if (["marsh", "wet-meadow"].includes(habitatType)) return waterAvailability > .78 ? "reeds-and-sedges" : "wet-meadow-grasses";
  if (["wooded-swamp", "riparian-woodland"].includes(habitatType)) return "water-tolerant-trees";
  if (habitatType === "shrub-swamp" || habitatType === "riparian-thicket") return "water-tolerant-shrubs";
  if (cell.plantType === "tree") {
    if (temperature < 7) return "cold-climate-trees";
    if (temperature > 20 && waterAvailability > .62) return "humid-broadleaf-trees";
    if (["savanna", "dry-forest"].includes(habitatType)) return "drought-tolerant-trees";
    return "temperate-broadleaf-trees";
  }
  if (cell.plantType === "shrub") return habitatType === "thorn-scrub" ? "thorny-dry-shrubs" : temperature < 5 ? "cold-low-shrubs" : "mixed-shrubs";
  if (habitatType === "tall-grassland") return "tall-grasses";
  if (["dry-grassland", "hot-desert", "cold-desert"].includes(habitatType)) return "drought-grasses";
  if (habitatType === "cold-grassland" || habitatType === "tundra") return "cold-grasses-and-sedges";
  return "short-grasses";
}

function classifyHabitat(cell, temperature, waterAvailability, canopy, understory, density) {
  if (cell.water || (cell.waterDepth || 0) > .02) return "open-water";
  if (cell.terrainClass === "snow" || (cell.snowPack || 0) > .12) return "snow";
  if (cell.rocky) return temperature < 2 && density < .16 ? "cold-desert" : "rock";
  if (cell.wetland || waterAvailability > .72 && (cell.floodFrequency || 0) > .16) {
    if (cell.woodland || canopy > .42) return "wooded-swamp";
    if (cell.shrubland || cell.plantType === "shrub") return "shrub-swamp";
    return (cell.floodFrequency || 0) > .5 || waterAvailability > .84 ? "marsh" : "wet-meadow";
  }
  if (cell.woodland || cell.plantType === "tree" || canopy > .28) {
    if (cell.riparian || waterAvailability > .67) return "riparian-woodland";
    if (temperature < 7) return "boreal-forest";
    if (temperature > 20 && waterAvailability > .62 && canopy > .62) return "humid-tropical-forest";
    if (waterAvailability < .36) return canopy < .54 ? "savanna" : "dry-forest";
    if (canopy < .5 || understory > canopy * .82) return temperature > 17 ? "savanna" : "open-woodland";
    return "temperate-forest";
  }
  if (cell.shrubland || cell.plantType === "shrub" || understory > .5) {
    if (cell.riparian || waterAvailability > .68) return "riparian-thicket";
    if (temperature < 5) return "cold-scrub";
    if (temperature > 20 && waterAvailability < .38) return "thorn-scrub";
    return "shrubland";
  }
  if (waterAvailability < .2 && density < .2) return temperature >= 12 ? "hot-desert" : "cold-desert";
  if (temperature < -2 && density < .22) return "tundra";
  if ((cell.biomass || 0) < .1) return temperature > 24 && waterAvailability < .34 ? "hot-desert" : temperature < 5 ? "cold-desert" : "bare-ground";
  if (temperature < 5) return "cold-grassland";
  if (waterAvailability < .38 || cell.terrainClass === "dryGrass") return "dry-grassland";
  return (cell.grassHeight || 0) > .62 ? "tall-grassland" : "short-grassland";
}

export function habitatProfile(cell = {}) {
  const temperature = Number.isFinite(Number(cell.temperature)) ? Number(cell.temperature) : Number(cell.baseTemperature) || 15;
  const soilMoisture = clamp(cell.ecoMoisture ?? cell.moisture);
  const groundwater = normalizedGroundwater(cell);
  const atmosphericHumidity = clamp(cell.humidity ?? soilMoisture);
  const surfaceInfluence = clamp((cell.waterDepth || 0) * 2.2 + (cell.floodFrequency || 0) * .42 + (cell.riparian ? .18 : 0));
  const waterAvailability = clamp(soilMoisture * .46 + groundwater * .24 + atmosphericHumidity * .16 + surfaceInfluence * .14);
  const maxBiomass = cell.plantType === "tree" ? 1.2 : cell.plantType === "shrub" ? .8 : 1;
  const biomass = clamp((cell.biomass || 0) / maxBiomass);
  const woodlandDensity = clamp(cell.woodlandDensity ?? (cell.woodland ? .55 : cell.shrubland ? .24 : 0));
  const canopy = clamp(cell.canopyCover ?? (cell.woodland && cell.plantType === "tree" ? .22 + woodlandDensity * .7 : cell.woodland ? woodlandDensity * .32 : 0));
  const understory = clamp(cell.understoryDensity ?? (cell.shrubland ? .62 : cell.plantType === "shrub" ? biomass * .75 : (cell.grassHeight || 0) * (1 - canopy * .7)));
  const density = cell.water ? 0 : clamp(biomass * .44 + canopy * .27 + understory * .14 + woodlandDensity * .15);
  const habitatType = classifyHabitat(cell, temperature, waterAvailability, canopy, understory, density);
  const humidity = clamp(atmosphericHumidity * .38 + waterAvailability * .44 + canopy * .12 + (cell.wetland ? .12 : 0) - (cell.windExposure || 0) * .08);
  const densityBand = band(density, HABITAT_DENSITY_BANDS);
  const humidityBand = band(humidity, HABITAT_HUMIDITY_BANDS.length);
  const result = {
    type: habitatType,
    label: HABITAT_LABELS[habitatType] || habitatType.replaceAll("-", " "),
    plantCommunity: plantCommunity(cell, habitatType, temperature, waterAvailability),
    density,
    densityBand,
    densityLevel: densityBand + 1,
    humidity,
    humidityBand,
    humidityLabel: HABITAT_HUMIDITY_BANDS[humidityBand],
    temperature,
    temperatureBand: temperatureBand(temperature),
    temperatureLabel: HABITAT_TEMPERATURE_BANDS[temperatureBand(temperature)],
    waterAvailability,
    aridity: clamp(1 - waterAvailability),
    canopy,
    understory,
    woodlandDensity
  };
  return Object.freeze(result);
}

export function applyHabitatProfile(cell = {}) {
  const profile = habitatProfile(cell);
  Object.assign(cell, {
    habitatType: profile.type,
    habitatLabel: profile.label,
    plantCommunity: profile.plantCommunity,
    habitatDensity: profile.density,
    habitatDensityBand: profile.densityBand,
    habitatHumidity: profile.humidity,
    habitatHumidityBand: profile.humidityBand,
    habitatTemperatureBand: profile.temperatureBand,
    waterAvailability: profile.waterAvailability,
    aridity: profile.aridity,
    canopyDensity: profile.canopy,
    understoryDensity: profile.understory,
    woodlandDensity: profile.woodlandDensity
  });
  return profile;
}

const COLOUR_RANGES = Object.freeze({
  water: [[72, 151, 194], [24, 86, 145]], wetland: [[111, 151, 105], [35, 86, 63]], forest: [[112, 153, 84], [20, 67, 43]],
  woodland: [[143, 158, 86], [50, 101, 52]], shrub: [[151, 157, 87], [61, 112, 58]], grass: [[158, 166, 91], [55, 132, 68]],
  dry: [[194, 169, 96], [132, 111, 61]], cold: [[159, 169, 143], [80, 104, 90]], bare: [[145, 117, 78], [101, 78, 55]],
  rock: [[135, 142, 137], [91, 99, 96]], snow: [[235, 241, 239], [196, 215, 216]]
});

export function habitatColourRgb(cell = {}) {
  const profile = cell.habitatType ? {
    type: cell.habitatType,
    density: clamp(cell.habitatDensity),
    waterAvailability: clamp(cell.waterAvailability),
    temperature: Number(cell.temperature) || 15
  } : habitatProfile(cell);
  let family = "grass";
  if (profile.type === "open-water") family = "water";
  else if (["marsh", "wet-meadow", "wooded-swamp", "shrub-swamp"].includes(profile.type)) family = "wetland";
  else if (["humid-tropical-forest", "temperate-forest", "boreal-forest", "dry-forest", "riparian-woodland"].includes(profile.type)) family = "forest";
  else if (["open-woodland", "savanna"].includes(profile.type)) family = "woodland";
  else if (["shrubland", "thorn-scrub", "cold-scrub", "riparian-thicket"].includes(profile.type)) family = "shrub";
  else if (["hot-desert", "dry-grassland"].includes(profile.type)) family = "dry";
  else if (["cold-desert", "cold-grassland", "tundra"].includes(profile.type)) family = "cold";
  else if (profile.type === "rock") family = "rock";
  else if (profile.type === "snow") family = "snow";
  else if (profile.type === "bare-ground") family = "bare";
  const [sparse, dense] = COLOUR_RANGES[family];
  const strength = family === "water" ? clamp((cell.waterDepth || 0) * 1.4 + .25) : profile.density;
  const moistureTone = (profile.waterAvailability - .5) * (family === "dry" ? .14 : .08);
  return [mix(sparse[0], dense[0], strength), mix(sparse[1], dense[1], clamp(strength + moistureTone)), mix(sparse[2], dense[2], strength)];
}

export function habitatSummary(cell = {}) {
  const profile = habitatProfile(cell);
  return `${profile.label}; ${profile.plantCommunity.replaceAll("-", " ")}; density ${profile.densityLevel}/${HABITAT_DENSITY_BANDS}; ${profile.humidityLabel} humidity; ${profile.temperatureLabel} (${profile.temperature.toFixed(1)}°C)`;
}
