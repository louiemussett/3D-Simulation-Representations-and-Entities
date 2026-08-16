const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function estimateNeedWindow({ amount = 0, depletionPerHour = 0, reserve = 0 } = {}) {
  const rate = Math.max(.0001, Number(depletionPerHour) || 0);
  return Math.max(0, (Number(amount) - Number(reserve || 0)) / rate);
}

export function estimateAcquisitionEta({ distance = Infinity, worldUnitsPerTick = 0, ecologicalHoursPerTick = 0, acquisitionHours = .2 } = {}) {
  if (!Number.isFinite(distance) || distance < 0 || worldUnitsPerTick <= 0 || ecologicalHoursPerTick <= 0) return Infinity;
  return distance / worldUnitsPerTick * ecologicalHoursPerTick + Math.max(0, acquisitionHours);
}

export function prospectiveUrgency({ remainingHours = Infinity, acquisitionEtaHours = Infinity, safetyHours = 2, currentDeficit = 0 } = {}) {
  if (!Number.isFinite(acquisitionEtaHours)) return clamp(28 + currentDeficit * .72, 0, 100);
  const leadTime = acquisitionEtaHours + Math.max(0, safetyHours);
  const schedulePressure = leadTime / Math.max(.25, remainingHours);
  return clamp(Math.max(currentDeficit, schedulePressure * 72), 0, 100);
}

export function completionForecast({ remainingHours = Infinity, preparationHours = 0, travelHours = Infinity, acquisitionHours = .2, recoveryHours = 0, uncertaintyHours = 0, safetyHours = 2 } = {}) {
  const requiredHours = Math.max(0, preparationHours) + Math.max(0, travelHours) + Math.max(0, acquisitionHours) + Math.max(0, recoveryHours) + Math.max(0, uncertaintyHours) + Math.max(0, safetyHours);
  const marginHours = Number.isFinite(remainingHours) && Number.isFinite(requiredHours) ? remainingHours - requiredHours : -Infinity;
  const ratio = Number.isFinite(remainingHours) && remainingHours > 0 ? requiredHours / remainingHours : Infinity;
  const state = marginHours < 0 ? "predicted-failure" : ratio >= .88 ? "emergency" : ratio >= .62 ? "commit-now" : ratio >= .38 ? "plan-soon" : "comfortable";
  return Object.freeze({ remainingHours, requiredHours, marginHours, ratio, state, viable: marginHours >= 0 });
}

export function protectedActivityAssessment({ planning, durationHours = 0, waterCostPerHour = 0, recoveryHours = 0, uncertaintyHours = 0, protectedWater = 15 } = {}) {
  const water = planning?.water;
  if (!water) return Object.freeze({ allowed: true, reason: "no water forecast is available", projectedHydration: Infinity });
  const projectedHydration = Number(water.amount ?? 100) - Math.max(0, durationHours + recoveryHours + uncertaintyHours) * Math.max(0, waterCostPerHour || water.depletionPerHour || 0);
  const completion = completionForecast({ remainingHours: water.remainingHours, preparationHours: durationHours + recoveryHours, travelHours: water.travelHours ?? water.etaHours, acquisitionHours: water.acquisitionHours ?? .25, recoveryHours: water.recoveryHours || 0, uncertaintyHours: Math.max(uncertaintyHours, water.uncertaintyHours || 0), safetyHours: water.safetyHours });
  const allowed = completion.viable && projectedHydration >= protectedWater;
  return Object.freeze({ allowed, projectedHydration, completion, reason: allowed ? "survival reserves remain protected" : !completion.viable ? "activity would make water acquisition miss its safe window" : "activity would consume protected hydration reserve" });
}

export function planReconsideration({ targetDisproved = false, etaIncreaseRatio = 0, prerequisiteImpossible = false, nearerResourceRatio = 1, threatChanged = false, emergencyBoundaryCrossed = false, progressPerHour = Infinity, stalledHours = 0 } = {}) {
  if (targetDisproved) return Object.freeze({ reconsider: true, reason: "target disproved" });
  if (prerequisiteImpossible) return Object.freeze({ reconsider: true, reason: "prerequisite became impossible" });
  if (emergencyBoundaryCrossed) return Object.freeze({ reconsider: true, reason: "physical reserves crossed an emergency boundary" });
  if (threatChanged) return Object.freeze({ reconsider: true, reason: "threat conditions changed" });
  if (etaIncreaseRatio >= .35) return Object.freeze({ reconsider: true, reason: "ETA increased substantially" });
  if (nearerResourceRatio <= .7) return Object.freeze({ reconsider: true, reason: "a materially nearer resource was discovered" });
  if (stalledHours >= 1 && progressPerHour < .08) return Object.freeze({ reconsider: true, reason: "progress remained near zero for too long" });
  return Object.freeze({ reconsider: false, reason: "plan remains viable and is making progress" });
}

export function needPlan({ amount, depletionPerHour, reserve, distance, worldUnitsPerTick, ecologicalHoursPerTick, acquisitionHours, safetyHours, currentDeficit, preparationHours = 0, recoveryHours = 0, uncertaintyHours = 0 } = {}) {
  const remainingHours = estimateNeedWindow({ amount, depletionPerHour, reserve });
  const travelHours = estimateAcquisitionEta({ distance, worldUnitsPerTick, ecologicalHoursPerTick, acquisitionHours: 0 });
  const etaHours = Number.isFinite(travelHours) ? travelHours + Math.max(0, preparationHours) + Math.max(0, acquisitionHours || 0) + Math.max(0, recoveryHours) + Math.max(0, uncertaintyHours) : Infinity;
  const predictedAmountAtArrival = Number.isFinite(etaHours) ? Math.max(0, Number(amount || 0) - Math.max(0, Number(depletionPerHour) || 0) * etaHours) : 0;
  const completion = completionForecast({ remainingHours, preparationHours, travelHours, acquisitionHours, recoveryHours, uncertaintyHours, safetyHours });
  return Object.freeze({ amount: Number(amount || 0), depletionPerHour: Number(depletionPerHour || 0), remainingHours, travelHours, etaHours, acquisitionHours: Math.max(0, acquisitionHours || 0), preparationHours: Math.max(0, preparationHours), recoveryHours: Math.max(0, recoveryHours), uncertaintyHours: Math.max(0, uncertaintyHours), predictedAmountAtArrival, reserve: Number(reserve || 0), safetyHours: Math.max(0, Number(safetyHours) || 0), forecastState: completion.state, viable: completion.viable, marginHours: completion.marginHours, urgency: prospectiveUrgency({ remainingHours, acquisitionEtaHours: etaHours, safetyHours, currentDeficit }), distance });
}

export function formatEta(hours) {
  if (!Number.isFinite(hours)) return "unknown";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  return `${(hours / 24).toFixed(hours < 240 ? 1 : 0)} d`;
}
