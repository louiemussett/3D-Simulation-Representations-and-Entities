const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function endurancePresentation(energy, fatigue, maximumEnergy = 120, sprintEnergy = 0, emergencyReserve = 0, maximumSprint = 100) {
  const safeEnergy = clamp(Number(energy) || 0, 0, maximumEnergy);
  const safeFatigue = clamp(Number(fatigue) || 0, 0, 100);
  return {
    energy: safeEnergy,
    endurance: 100 - safeFatigue,
    energyFill: safeEnergy / maximumEnergy,
    enduranceFill: (100 - safeFatigue) / 100,
    sprint: clamp(Number(sprintEnergy) || 0, 0, maximumSprint), sprintFill: clamp(Number(sprintEnergy) || 0, 0, maximumSprint) / maximumSprint,
    emergency: clamp(Number(emergencyReserve) || 0, 0, 1), emergencyFill: clamp(Number(emergencyReserve) || 0, 0, 1)
  };
}
