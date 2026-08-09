const band = (value, step) => Math.floor(Math.max(0, Number(value) || 0) / step);
export function vegetationPresentationState(cell = {}, tick = 0) { return { signature: `${cell.terrainClass}|${cell.plantType}|${Boolean(cell.woodland)}|${Boolean(cell.shrubland)}|${cell.woodyStage}|${Boolean(cell.leaflessTreeUntil > tick)}|${Boolean(cell.leafDepletedUntil > tick)}|${Boolean(cell.fallenTreeUntil > tick)}|${band(cell.biomass, .08)}|${band(cell.grassHeight, .1)}`, biomass: Number(cell.biomass) || 0, grassHeight: Number(cell.grassHeight) || 0 }; }

export class VegetationPresentationInvalidator {
  constructor(maxDelayTicks = 30) { this.maxDelayTicks = Math.max(1, Math.floor(maxDelayTicks)); this.rendered = new Map(); this.pending = new Map(); }
  observe(id, state, tick, force = false) { const prior = this.rendered.get(id); if (force || !prior || prior.signature !== state.signature) { this.pending.set(id, { state, since: tick }); return true; } const rawChanged = Math.abs(prior.biomass - state.biomass) > .0001 || Math.abs(prior.grassHeight - state.grassHeight) > .0001; if (!rawChanged) { this.pending.delete(id); return false; } const pending = this.pending.get(id) || { state, since: tick }; pending.state = state; this.pending.set(id, pending); return tick - pending.since >= this.maxDelayTicks; }
  due(tick) { return [...this.pending].filter(([, item]) => tick - item.since >= this.maxDelayTicks).map(([id]) => id); }
  commit(id, state) { this.rendered.set(id, state); this.pending.delete(id); }
  clear() { this.rendered.clear(); this.pending.clear(); }
}
