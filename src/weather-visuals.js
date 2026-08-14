import { PRECIPITATION_ACTIVE_THRESHOLD } from "./localized-weather.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const WEATHER_OVERLAY_LAYERS = Object.freeze(["precipitation", "cloud-cover", "ground-wetness", "visibility", "storm"]);

export function precipitationBand(intensity = 0, temperature = 10) {
  const value = clamp(Number(intensity) || 0, 0, 1);
  if (value <= PRECIPITATION_ACTIVE_THRESHOLD) return Object.freeze({ key: "none", label: "No precipitation", colour: "#5a665f" });
  if (temperature <= 0) return Object.freeze({ key: "snow", label: "Snow", colour: "#e6f5ff" });
  if (value < .12) return Object.freeze({ key: "drizzle", label: "Drizzle", colour: "#b7dbe8" });
  if (value < .3) return Object.freeze({ key: "light", label: "Light rain", colour: "#74b8d7" });
  if (value < .58) return Object.freeze({ key: "moderate", label: "Moderate rain", colour: "#3481bd" });
  if (value < .82) return Object.freeze({ key: "heavy", label: "Heavy rain", colour: "#334ea8" });
  return Object.freeze({ key: "severe", label: "Severe storm", colour: "#713797" });
}

export function weatherVisualBudget(quality = "high", density = .75, largeMap = false) {
  const base = { off: [0, 0], low: [12, 10], high: [28, 22], cinematic: [44, 34] }[quality] || [28, 22];
  const performance = largeMap ? .65 : 1, scale = clamp(Number(density) || .75, .35, 1.5) * performance;
  return Object.freeze({ cloudClusters: Math.round(base[0] * scale), precipitationShafts: Math.round(base[1] * scale), localDrops: Math.round(700 * scale), splashes: Math.round(120 * scale) });
}

export function weatherOverlayLegend(layer = "precipitation") {
  if (layer === "cloud-cover") return Object.freeze({ title: "Cloud cover", stops: [["Clear", "#13231e"], ["Broken", "#68736f"], ["Overcast", "#e2e7e5"]] });
  if (layer === "ground-wetness") return Object.freeze({ title: "Ground wetness", stops: [["Dry", "#9b8a58"], ["Damp", "#4a866f"], ["Saturated", "#173d59"]] });
  if (layer === "visibility") return Object.freeze({ title: "Visibility", stops: [["Very poor", "#d3c2cb"], ["Reduced", "#819aa4"], ["Clear", "#dfeec2"]] });
  if (layer === "storm") return Object.freeze({ title: "Storm intensity", stops: [["Calm", "#243a35"], ["Unsettled", "#926e3c"], ["Severe", "#a62d68"]] });
  return Object.freeze({ title: "Precipitation", stops: [["None", "#26372f"], ["Drizzle", "#b7dbe8"], ["Light", "#74b8d7"], ["Moderate", "#3481bd"], ["Heavy", "#334ea8"], ["Severe", "#713797"], ["Snow", "#e6f5ff"]] });
}

export function weatherShaderLayerIndex(layer = "precipitation") {
  return Math.max(0, WEATHER_OVERLAY_LAYERS.indexOf(layer));
}
