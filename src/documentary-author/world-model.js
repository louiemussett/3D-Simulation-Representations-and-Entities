const boundedSet = (map, key, value, maximum) => { map.set(key, value); while (map.size > maximum) map.delete(map.keys().next().value); return value; };

export class DocumentaryWorldModel {
  constructor({ maximumEntities = 2000, maximumClaims = 5000, maximumProcesses = 1000 } = {}) { this.maximumEntities = maximumEntities; this.maximumClaims = maximumClaims; this.maximumProcesses = maximumProcesses; this.entities = new Map(); this.relationships = new Map(); this.locations = new Map(); this.processes = new Map(); this.situations = new Map(); this.activeClaims = new Map(); this.uncertainties = new Map(); }
  ingest(proposition, claim) { for (const entityId of proposition.subjectIds) { const previous = this.entities.get(entityId) || { entityId, propositions: [], notableEpisodes: [], firstObservedTick: proposition.validity.fromTick }; previous.propositions = [...previous.propositions, proposition.propositionId].slice(-64); previous.lastObservedTick = proposition.validity.fromTick; boundedSet(this.entities, entityId, previous, this.maximumEntities); } boundedSet(this.activeClaims, `${proposition.predicate}:${proposition.subjectIds.join("|")}`, { proposition, claim }, this.maximumClaims); if (!proposition.subjectIds.length) boundedSet(this.processes, proposition.predicate, { proposition, claim }, this.maximumProcesses); return proposition; }
  entity(id) { return this.entities.get(id) || null; }
  relevant(subjectIds = []) { const wanted = new Set(subjectIds); return [...this.activeClaims.values()].filter(({ proposition }) => !proposition.subjectIds.length || proposition.subjectIds.some(id => wanted.has(id))); }
}

