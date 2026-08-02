const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function initialStomachPercent(speciesId, lifeStage, randomValue = 0.5) {
  const unit = clamp01(randomValue);
  if (lifeStage === "dependent") return 72 + unit * 16;
  if (speciesId === "hunter") return 58 + unit * 24;
  return 45 + unit * 25;
}

export function ecologyPreset(name = "opening") {
  const presets = {
    opening: { seeds: 20, minutes: 60 },
    population: { seeds: 12, minutes: 30 * 24 * 60 },
    generational: { seeds: 8, minutes: 180 * 24 * 60 }
  };
  if (!presets[name]) throw new Error(`Unknown ecology preset: ${name}`);
  return { name, ...presets[name] };
}
