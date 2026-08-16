const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smoothstep = (low, high, value) => {
  const amount = clamp((value - low) / Math.max(.000001, high - low), 0, 1);
  return amount * amount * (3 - 2 * amount);
};

export const PRECIPITATION_ACTIVE_THRESHOLD = .035;

// A trace atmospheric value is not rainfall. Keeping this gate in the shared
// weather module ensures visuals, sound, captions and scientific overlays all
// agree about whether precipitation is physically occurring.
export function activePrecipitationIntensity(value = 0) {
  const rain = clamp(Number(value) || 0, 0, 1);
  return rain > PRECIPITATION_ACTIVE_THRESHOLD ? rain : 0;
}

// Low-pressure systems form and dissipate instead of remaining equally active
// for their whole journey across the map. Missing fields use deterministic
// defaults so old saves acquire the same lifecycle without consuming RNG.
export function weatherSystemActivity(system = {}, index = 0, ecologicalHour = 0) {
  const periodHours = Math.max(24, Number(system.periodHours) || 84 + index * 17);
  const fallbackPhase = ((index * .431 + (Number(system.radius) || 50) * .013) % 1 + 1) % 1;
  const phase = Number.isFinite(Number(system.activityPhase)) ? Number(system.activityPhase) : fallbackPhase;
  const cycle = .5 + Math.sin(Math.PI * 2 * (Number(ecologicalHour || 0) / periodHours + phase)) * .5;
  if (system.kind === "high") return .55 + smoothstep(.12, .88, cycle) * .45;
  return smoothstep(.22, .72, cycle);
}

// Humidity supplies vapour and cloud, but it cannot create rain by itself.
// Rain requires frontal, convective or orographic lift and is suppressed by
// high pressure and a lee-side rain shadow.
export function precipitationFromAtmosphere({ humidity = 0, lowPressure = 0, highPressure = 0, uplift = 0, lee = 0, storm = 0, rainfallScale = 1 } = {}) {
  const scale = clamp(Number(rainfallScale) || 0, 0, 3);
  if (scale <= 0) return 0;
  const moisture = clamp(Number(humidity) || 0, 0, 1);
  const frontalLift = smoothstep(.1, .58, Math.max(0, Number(lowPressure) || 0));
  const condensation = smoothstep(.43, .72, moisture);
  const orographicLift = smoothstep(.012, .16, Math.max(0, Number(uplift) || 0)) * smoothstep(.36, .68, moisture);
  const convectiveLift = smoothstep(.12, .72, Math.max(0, Number(storm) || 0));
  const suppression = clamp(Math.max(0, Number(highPressure) || 0) * 1.05 + Math.max(0, Number(lee) || 0) * .82, 0, 1);
  const forcing = Math.max(frontalLift * condensation, orographicLift, convectiveLift) - suppression;
  if (forcing <= .055) return 0;
  const raw = clamp((forcing * .72 + convectiveLift * .22) * scale, 0, 1);
  const formed = raw * smoothstep(.055, .2, raw);
  return activePrecipitationIntensity(formed);
}

export function localizedWeatherPresentation(weather = {}) {
  const rain = activePrecipitationIntensity(weather.rain), wind = clamp(Number(weather.wind || 0), 0, 1.5), pressure = Number(weather.pressure || 0), storm = clamp(Number(weather.stormFactor || 0), 0, 1), temperature = Number(weather.temp ?? 15), suppliedCloud = Number(weather.cloudCover);
  return Object.freeze({
    cloudCover: Number.isFinite(suppliedCloud) ? clamp(suppliedCloud, 0, 1) : clamp(.18 + rain * .55 + storm * .25 - pressure * .35, 0, 1),
    precipitationType: rain <= 0 ? "none" : temperature <= 0 ? "snow" : "rain",
    precipitationIntensity: rain,
    wetness: clamp(Number(weather.groundWetness ?? rain * .85), 0, 1),
    gustStrength: clamp(wind * (.7 + storm * .55), 0, 1.5),
    visibility: clamp(1 - rain * .55 - storm * .28, .12, 1),
    solarIllumination: clamp(1 - rain * .45 - storm * .35 - Math.max(0, -pressure) * .2, .12, 1),
    waterRoughness: clamp(.12 + wind * .62 + rain * .2, .08, 1),
    acousticMasking: clamp(rain * .58 + wind * .36 + storm * .24, 0, 1)
  });
}

export function encodeWeatherFieldTexture(weatherField) {
  if (!weatherField?.width || !weatherField.values?.length) return null;
  const data = new Uint8Array(weatherField.width * weatherField.width * 4);
  for (let index = 0; index < weatherField.values.length; index += 1) {
    const state = localizedWeatherPresentation(weatherField.values[index]), offset = index * 4;
    data[offset] = Math.round(state.cloudCover * 255);
    data[offset + 1] = Math.round(state.precipitationIntensity * 255);
    data[offset + 2] = Math.round(state.wetness * 255);
    data[offset + 3] = Math.round(state.solarIllumination * 255);
  }
  return Object.freeze({ width: weatherField.width, height: weatherField.width, data, channels: Object.freeze(["cloud-cover", "precipitation", "wetness", "solar-illumination"]) });
}

export function weatherFieldRefreshDue(previous, systems = [], cellSize = 16, ecologicalHour = 0) {
  if (!previous?.systemPositions || previous.systemPositions.length !== systems.length) return true;
  if (previous.activityWindow !== Math.floor(Number(ecologicalHour || 0) / 3)) return true;
  const threshold = Math.max(1, cellSize * .25);
  return systems.some((system, index) => Math.hypot(system.x - previous.systemPositions[index].x, system.z - previous.systemPositions[index].z) >= threshold);
}

export function weatherFieldRefreshMarker(systems = [], ecologicalHour = 0) {
  return Object.freeze({ activityWindow: Math.floor(Number(ecologicalHour || 0) / 3), systemPositions: Object.freeze(systems.map(system => Object.freeze({ x: system.x, z: system.z }))) });
}
