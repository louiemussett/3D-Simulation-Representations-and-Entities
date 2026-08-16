const DEFAULT_HISTORY_LIMIT = 240;

export const ECOLOGY_FLOWS = Object.freeze([
  "plantGrowth", "plantNaturalLoss", "plantConsumed", "corpseCreated", "corpseConsumed", "corpseDecayed",
  "feedingEnergyGained", "basalMetabolism", "movementEnergy", "attackEnergy", "reproductionEnergy",
  "offspringStartingEnergy", "nursingEnergyGained", "recoveryEnergyGained", "healthRecovered", "healthLost",
  "waterDrunk", "forageWaterGained", "carcassWaterGained", "nursingWaterGained",
  "basalWaterLost", "thermalWaterLost", "activityWaterLost", "pregnancyWaterLost", "lactationWaterLost"
]);

function emptyTotals() { return Object.fromEntries(ECOLOGY_FLOWS.map((key) => [key, 0])); }
function finiteAmount(value) { return Number.isFinite(value) ? Math.max(0, value) : 0; }

export class EcologicalAccounting {
  constructor({ historyLimit = DEFAULT_HISTORY_LIMIT, enabled = false } = {}) {
    this.historyLimit = Math.max(1, Math.floor(historyLimit));
    this.enabled = Boolean(enabled);
    this.reset();
  }
  setEnabled(enabled) { this.enabled = Boolean(enabled); return this.enabled; }
  reset() { this.totals = emptyTotals(); this.current = null; this.history = []; }
  beginTick(tick, stocks = null) { if (!this.enabled) return; if (this.current) this.endTick(); this.current = { tick, flows: emptyTotals(), stocksBefore: stocks ? { ...stocks } : null }; }
  record(flow, amount) {
    if (!this.enabled) return 0;
    if (!Object.hasOwn(this.totals, flow)) throw new Error(`Unknown ecological flow: ${flow}`);
    const value = finiteAmount(amount);
    this.totals[flow] += value;
    if (this.current) this.current.flows[flow] += value;
    return value;
  }
  endTick(stocks = null) {
    if (!this.current) return null;
    const completed = { ...this.current, stocksAfter: stocks ? { ...stocks } : null }; this.current = null;
    this.history.push(completed);
    if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
    return completed;
  }
  report() {
    const t = this.totals;
    return {
      enabled: this.enabled, totals: { ...t },
      derived: {
        plantBiomassNet: t.plantGrowth - t.plantNaturalLoss - t.plantConsumed,
        corpseBiomassNet: t.corpseCreated - t.corpseConsumed - t.corpseDecayed,
        measuredEnergyIn: t.feedingEnergyGained + t.nursingEnergyGained + t.recoveryEnergyGained + t.offspringStartingEnergy,
        measuredEnergyOut: t.basalMetabolism + t.movementEnergy + t.attackEnergy + t.reproductionEnergy,
        measuredWaterIn: t.waterDrunk + t.forageWaterGained + t.carcassWaterGained + t.nursingWaterGained,
        measuredWaterOut: t.basalWaterLost + t.thermalWaterLost + t.activityWaterLost + t.pregnancyWaterLost + t.lactationWaterLost
      },
      retainedTicks: this.history.length,
      historyLimit: this.historyLimit,
      recent: this.history.map((entry) => ({ tick: entry.tick, flows: { ...entry.flows }, stocksBefore: entry.stocksBefore ? { ...entry.stocksBefore } : null, stocksAfter: entry.stocksAfter ? { ...entry.stocksAfter } : null }))
    };
  }
}

export function worldStocks(world) {
  const living = (world.animals || []).filter((animal) => animal.alive);
  return {
    plantBiomass: (world.cells || []).reduce((sum, cell) => sum + finiteAmount(cell.biomass), 0),
    corpseBiomass: (world.corpses || []).reduce((sum, corpse) => sum + finiteAmount(corpse.biomass), 0),
    livingEnergy: living.reduce((sum, animal) => sum + finiteAmount(animal.energy), 0),
    livingBodyMass: living.reduce((sum, animal) => sum + finiteAmount(animal.bodyMass), 0),
    livingHealth: living.reduce((sum, animal) => sum + finiteAmount(animal.health), 0),
    livingHydration: living.reduce((sum, animal) => sum + finiteAmount(animal.hydration), 0)
  };
}
