const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
};

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const finiteNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positiveNumber = (value, fallback, minimum = 0, maximum = Infinity) => clamp(finiteNumber(value, fallback), minimum, maximum);

const normalizedLayoutProfileCache = new WeakMap();
const layoutPerformanceMetrics = { profileCacheHits: 0, profileCacheMisses: 0, budgetIdLookups: 0, relationIdLookups: 0 };
let layoutMetricsEnabled = false;
const recordLayoutMetric = (name, amount = 1) => { if (layoutMetricsEnabled) layoutPerformanceMetrics[name] += amount; };
export function entityConstellationLayoutMetrics({ reset = false } = {}) {
  const snapshot = freeze({ enabled: layoutMetricsEnabled, ...layoutPerformanceMetrics });
  if (reset) for (const key of Object.keys(layoutPerformanceMetrics)) layoutPerformanceMetrics[key] = 0;
  return snapshot;
}
export function resetEntityConstellationLayoutMetrics() { entityConstellationLayoutMetrics({ reset: true }); }
export function setEntityConstellationLayoutMetricsEnabled(enabled) { layoutMetricsEnabled = Boolean(enabled); return layoutMetricsEnabled; }

const ACCENTS = freeze([
  { id: "cyan", value: "#6fe7f7" },
  { id: "amber", value: "#ffd166" },
  { id: "violet", value: "#c9a0ff" },
  { id: "lime", value: "#b7e36c" },
  { id: "coral", value: "#ff8a78" },
  { id: "blue", value: "#7ab8ff" },
  { id: "rose", value: "#ff9bcb" },
  { id: "ivory", value: "#e8f1ea" }
]);

const SHAPES = freeze(["circle", "triangle", "diamond", "square"]);
const TETHER_PATTERNS = freeze([
  { id: "solid", dash: [] },
  { id: "dashed", dash: [8, 5] },
  { id: "dotted", dash: [2, 5] }
]);

export const ENTITY_OWNERSHIP_STYLES = freeze({
  accents: ACCENTS,
  shapes: SHAPES,
  tetherPatterns: TETHER_PATTERNS,
  capacity: ACCENTS.length * SHAPES.length * TETHER_PATTERNS.length
});

const DEFAULT_CHANNELS = freeze(["identity", "expression", "signal", "action", "thought", "prediction", "urgent"]);
export const ENTITY_CONSTELLATION_PANEL_SCALE = freeze({ minimum: .42, maximum: 1.35, default: 1 });

/**
 * Returns true only while the entity's projected body still intersects the
 * camera viewport. Cards are deliberately culled from the owner's body, not
 * from their own clamped layout rectangle: an off-screen owner must never
 * leave an apparently ownerless card pinned to a screen edge.
 */
export function projectedEntityIntersectsViewport(rawProjection = {}, rawViewport = {}) {
  const screenX = Number(rawProjection.screenX), screenY = Number(rawProjection.screenY);
  const clipZ = Number(rawProjection.clipZ), viewDepth = Number(rawProjection.viewDepth);
  const projectedBodyPx = Math.max(0, finiteNumber(rawProjection.projectedBodyPx, 0));
  const left = finiteNumber(rawViewport.left, 0), top = finiteNumber(rawViewport.top, 0);
  const right = finiteNumber(rawViewport.right, finiteNumber(rawViewport.width, 0));
  const bottom = finiteNumber(rawViewport.bottom, finiteNumber(rawViewport.height, 0));
  if (![screenX, screenY, clipZ, viewDepth, left, top, right, bottom].every(Number.isFinite)) return false;
  if (right <= left || bottom <= top || viewDepth >= 0 || clipZ < -1 || clipZ > 1) return false;
  const radius = Math.max(2, projectedBodyPx * .5);
  return screenX + radius >= left && screenX - radius <= right && screenY + radius >= top && screenY - radius <= bottom;
}

/**
 * Applies a strict, centre-weighted budget before card layout. Screen-centre
 * proximity is the primary importance signal: selection, hover and active
 * interaction provide small tie-breaking bonuses, but cannot make a distant
 * owner displace a clearly more central one. A small previous-frame bias
 * prevents similarly placed owners swapping at the cutoff.
 *
 * The result contains IDs and decision metadata only, so caller-owned projected
 * records remain mutable and are never frozen as a side effect.
 */
export function selectEntityConstellationBudget(rawItems = [], rawOptions = {}) {
  if (!Array.isArray(rawItems)) throw new TypeError("selectEntityConstellationBudget expects an array of projected items");
  const bounds = rawOptions.viewportBounds || {};
  const left = finiteNumber(bounds.left, 0), top = finiteNumber(bounds.top, 0);
  const right = finiteNumber(bounds.right, finiteNumber(bounds.width, 0)), bottom = finiteNumber(bounds.bottom, finiteNumber(bounds.height, 0));
  if (![left, top, right, bottom].every(Number.isFinite) || right <= left || bottom <= top) throw new TypeError("selectEntityConstellationBudget requires finite usable viewport bounds");
  const width = right - left, height = bottom - top, centre = { x: left + width / 2, y: top + height / 2 };
  const automaticCapacity = clamp(Math.round(4 * Math.sqrt(width * height / (1280 * 720))), 3, 6);
  const capacity = Math.max(1, Math.floor(positiveNumber(rawOptions.maximumPanels, automaticCapacity, 1, 100)));
  const centreRadius = positiveNumber(rawOptions.centreRadius, .78, .2, 1.5);
  const previousRadiusBonus = positiveNumber(rawOptions.previousRadiusBonus, .1, 0, .5);
  const retentionBias = positiveNumber(rawOptions.retentionBias, .08, 0, .5);
  const selectedBias = positiveNumber(rawOptions.selectedBias, .12, 0, .4);
  const hoveredBias = positiveNumber(rawOptions.hoveredBias, .08, 0, .4);
  const focusRelatedBias = positiveNumber(rawOptions.focusRelatedBias, .04, 0, .3);
  const interactionBias = positiveNumber(rawOptions.interactionBias, .02, 0, .2);
  // Presence of this option is significant. A string admits exactly that
  // owner; an explicit null admits nobody (Cinema landscape/world shots).
  // Omitting it preserves the ordinary centre-ranked multi-panel overview.
  const hasExclusiveFocus = Object.prototype.hasOwnProperty.call(rawOptions, "exclusiveFocusId");
  const exclusiveFocusId = rawOptions.exclusiveFocusId == null ? null : String(rawOptions.exclusiveFocusId);
  const previousSource = rawOptions.previousVisibleIds;
  const previousVisibleIds = new Set(previousSource instanceof Map ? [...previousSource.keys()].map(String) : previousSource instanceof Set || Array.isArray(previousSource) ? [...previousSource].map(String) : []);
  const candidates = rawItems.map((item) => {
    const entityId = String(item?.entityId ?? item?.id ?? ""), screenX = Number(item?.screenX), screenY = Number(item?.screenY);
    if (!entityId) throw new TypeError("Every budget candidate requires a non-empty entityId");
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) throw new TypeError(`Budget candidate ${entityId} requires finite projected screen coordinates`);
    const normalizedX = (screenX - centre.x) / Math.max(1, width / 2), normalizedY = (screenY - centre.y) / Math.max(1, height / 2);
    const selected = Boolean(item.selected), projectedBodyPx = positiveNumber(item.projectedBodyPx, 12, 0, 240), retained = previousVisibleIds.has(entityId);
    return {
      entityId,
      screenX,
      screenY,
      selected,
      hovered: Boolean(item.hovered),
      projectedBodyPx,
      viewportAdmitted: item.viewportAdmitted !== false,
      interactionIds: [...new Set((item.interactionIds || []).map(String).filter((id) => id && id !== entityId))].sort((a, b) => a.localeCompare(b)),
      centreDistance: Math.hypot(normalizedX, normalizedY),
      retained
    };
  }).sort((a, b) => a.entityId.localeCompare(b.entityId));
  for (let index = 1; index < candidates.length; index += 1) if (candidates[index - 1].entityId === candidates[index].entityId) throw new TypeError(`Duplicate constellation budget entityId: ${candidates[index].entityId}`);

  const byId = new Map(candidates.filter((candidate) => candidate.viewportAdmitted).map((candidate) => [candidate.entityId, candidate]));
  const focusIds = new Set(candidates.filter((candidate) => candidate.viewportAdmitted && (candidate.selected || candidate.hovered)).map((candidate) => candidate.entityId));
  const focusRelatedIds = new Set(), interactionIds = new Set();
  for (const candidate of candidates) if (candidate.viewportAdmitted) for (const relatedId of candidate.interactionIds) if (byId.has(relatedId)) {
    interactionIds.add(candidate.entityId); interactionIds.add(relatedId);
    if (focusIds.has(candidate.entityId)) focusRelatedIds.add(relatedId);
    if (focusIds.has(relatedId)) focusRelatedIds.add(candidate.entityId);
  }
  const ranked = candidates.map((candidate) => {
    const priority = candidate.selected ? 0 : candidate.hovered ? 1 : focusRelatedIds.has(candidate.entityId) ? 2 : interactionIds.has(candidate.entityId) ? 3 : 4;
    const central = candidate.centreDistance <= centreRadius + (candidate.retained ? previousRadiusBonus : 0);
    // Selection, hover and a direct partner of either remain traceable even at
    // an edge. Everything else must be inside the central viewing aperture so
    // an interaction elsewhere on the map cannot fill the screen with cards.
    const exclusiveFocusEligible = !hasExclusiveFocus || candidate.entityId === exclusiveFocusId;
    // A nominated focus owner remains eligible anywhere its body intersects
    // the viewport. It must not lose the only permitted panel merely because
    // a non-permitted animal happens to be nearer the screen centre.
    const eligible = candidate.viewportAdmitted && exclusiveFocusEligible && (hasExclusiveFocus || priority < 3 || central);
    const focusBias = candidate.selected ? selectedBias : candidate.hovered ? hoveredBias : priority === 2 ? focusRelatedBias : priority === 3 ? interactionBias : 0;
    const distance = candidate.centreDistance;
    const effectiveDistance = distance - focusBias - (candidate.retained ? retentionBias : 0);
    const reason = candidate.selected ? "selected" : candidate.hovered ? "hovered" : priority === 2 ? "focus-interaction" : priority === 3 ? "active-interaction" : "centre";
    return { ...candidate, priority, central, exclusiveFocusEligible, eligible, distance, effectiveDistance, focusBias, reason };
  }).sort((a, b) => a.effectiveDistance - b.effectiveDistance || a.priority - b.priority || a.entityId.localeCompare(b.entityId));
  const admitted = new Set(ranked.filter((candidate) => candidate.eligible).slice(0, capacity).map((candidate) => candidate.entityId));
  const rankedById = new Map(ranked.map((candidate) => [candidate.entityId, candidate]));
  const decisions = candidates.map((candidate) => {
    recordLayoutMetric("budgetIdLookups");
    const rankedCandidate = rankedById.get(candidate.entityId), isAdmitted = admitted.has(candidate.entityId);
    return freeze({
      entityId: candidate.entityId,
      admitted: isAdmitted,
      reason: isAdmitted ? rankedCandidate.reason : !rankedCandidate.viewportAdmitted ? "outside-viewport" : !rankedCandidate.exclusiveFocusEligible ? "exclusive-focus" : rankedCandidate.eligible ? "capacity" : "outside-centre",
      priority: rankedCandidate.priority,
      centreDistance: rankedCandidate.centreDistance,
      retained: rankedCandidate.retained
    });
  });
  return freeze({
    capacity,
    candidateCount: candidates.length,
    admittedCount: admitted.size,
    suppressedCount: candidates.length - admitted.size,
    viewportBounds: { left, top, right, bottom },
    centre,
    centreRadius,
    exclusiveFocus: hasExclusiveFocus,
    exclusiveFocusId,
    visibleEntityIds: decisions.filter((decision) => decision.admitted).map((decision) => decision.entityId),
    suppressedEntityIds: decisions.filter((decision) => !decision.admitted).map((decision) => decision.entityId),
    decisions
  });
}

// There is one ownership surface at every admitted distance. These are base
// coordinates at panelScale=1; the resolver scales the entire constellation as
// one unit. Thought and prediction are optional attachments above the public
// panel rather than alternate black-panel zoom levels. Their visibility is
// supplied by the caller; selection is not a cognition-visibility gate.
const PANEL_SLOTS = freeze({
  panel: { x: 0, y: -5 },
  identity: { x: 0, y: -5 },
  expression: { x: -98, y: -5 },
  signal: { x: 98, y: -13 },
  action: { x: 98, y: 17 },
  thought: { x: -67, y: -96 },
  prediction: { x: 67, y: -96 },
  urgent: { x: -98, y: 20 }
});

const hashText = (value) => {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const styleAt = (styleIndex) => {
  const capacity = ENTITY_OWNERSHIP_STYLES.capacity;
  const normalized = ((styleIndex % capacity) + capacity) % capacity;
  const accent = ACCENTS[normalized % ACCENTS.length];
  const shapeIndex = Math.floor(normalized / ACCENTS.length) % SHAPES.length;
  const patternIndex = Math.floor(normalized / (ACCENTS.length * SHAPES.length)) % TETHER_PATTERNS.length;
  const tether = TETHER_PATTERNS[patternIndex];
  return freeze({
    styleIndex: normalized,
    accent: accent.value,
    accentId: accent.id,
    shape: SHAPES[shapeIndex],
    tetherPattern: tether.id,
    dash: [...tether.dash]
  });
};

const previousStyleIndex = (previous, entityId) => {
  if (!previous) return null;
  let candidate = previous instanceof Map ? previous.get(entityId) : previous[entityId];
  candidate = candidate?.style || candidate;
  const index = Number(candidate?.styleIndex);
  return Number.isInteger(index) && index >= 0 && index < ENTITY_OWNERSHIP_STYLES.capacity ? index : null;
};

/**
 * Assigns locally collision-free ownership styles. IDs are always sorted, so
 * caller iteration order cannot alter the result. A stable hash supplies each
 * entity's preferred visual combination; linear probing resolves collisions.
 */
export function assignClusterOwnership(entityIds = [], previous = null) {
  const ids = [...new Set(entityIds.map((id) => String(id)))].sort((left, right) => left.localeCompare(right));
  const used = new Set(), assigned = new Map();

  // Retain non-conflicting previous choices first. This is optional state for
  // renderers that want ownership accents to survive cluster membership churn.
  for (const entityId of ids) {
    const index = previousStyleIndex(previous, entityId);
    if (index === null || used.has(index)) continue;
    used.add(index); assigned.set(entityId, index);
  }

  for (const entityId of ids) {
    if (assigned.has(entityId)) continue;
    const preferred = hashText(entityId) % ENTITY_OWNERSHIP_STYLES.capacity;
    let index = preferred;
    for (let step = 0; step < ENTITY_OWNERSHIP_STYLES.capacity && used.has(index); step += 1) index = (preferred + step + 1) % ENTITY_OWNERSHIP_STYLES.capacity;
    // Visible clusters are bounded far below the catalogue capacity. If a
    // caller exceeds it, the short ID remains the final redundant identifier.
    if (used.has(index)) index = preferred;
    used.add(index); assigned.set(entityId, index);
  }

  return freeze(ids.map((entityId) => ({ entityId, ...styleAt(assigned.get(entityId)) })));
}

const normalizeChannels = (value) => {
  if (value == null) return new Set(DEFAULT_CHANNELS);
  if (value instanceof Set || Array.isArray(value)) return new Set([...value].map(String));
  if (typeof value === "object") return new Set(Object.entries(value).filter(([, visible]) => Boolean(visible)).map(([channel]) => channel));
  return new Set(DEFAULT_CHANNELS);
};

const normalizeItemLayoutProfile = (value) => {
  if (!value || typeof value !== "object") return null;
  if (Object.isFrozen(value)) {
    const cached = normalizedLayoutProfileCache.get(value);
    if (cached) { recordLayoutMetric("profileCacheHits"); return cached; }
  }
  recordLayoutMetric("profileCacheMisses");
  const slots = {};
  for (const [name, slot] of Object.entries(value.slots || {})) {
    if (!slot || !Number.isFinite(Number(slot.x)) || !Number.isFinite(Number(slot.y))) continue;
    slots[name] = freeze({ x: Number(slot.x), y: Number(slot.y) });
  }
  const sizes = {};
  for (const name of ["thought", "prediction"]) {
    const size = value.slotSizes?.[name];
    if (!size) continue;
    sizes[name] = freeze({
      width: positiveNumber(size.width, 0, 0, 4000),
      height: positiveNumber(size.height, 0, 0, 4000)
    });
  }
  const result = freeze({
    detailLevel: String(value.detailLevel || "panel"),
    panelWidthPx: positiveNumber(value.panelWidthPx, 258, 1, 4000),
    panelHeightPx: positiveNumber(value.panelHeightPx, 86, 1, 4000),
    panelCenterX: finiteNumber(value.panelCenterX, 0),
    panelCenterY: finiteNumber(value.panelCenterY, 0),
    attachmentPaddingPx: positiveNumber(value.attachmentPaddingPx, 0, 0, 400),
    isolatedOffsetX: Number.isFinite(Number(value.isolatedOffsetX)) ? Number(value.isolatedOffsetX) : null,
    isolatedOffsetY: Number.isFinite(Number(value.isolatedOffsetY)) ? Number(value.isolatedOffsetY) : null,
    fanDistancePx: Number.isFinite(Number(value.fanDistancePx)) ? positiveNumber(value.fanDistancePx, 0, 0, 800) : null,
    slots: freeze(slots),
    slotSizes: freeze(sizes)
  });
  if (Object.isFrozen(value)) normalizedLayoutProfileCache.set(value, result);
  return result;
};

const normalizeItems = (items) => {
  const normalized = items.map((item) => {
    const entityId = String(item?.entityId ?? item?.id ?? "");
    if (!entityId) throw new TypeError("Every constellation item requires a non-empty entityId");
    const screenX = Number(item.screenX), screenY = Number(item.screenY);
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) throw new TypeError(`Constellation ${entityId} requires finite projected screen coordinates`);
    const selected = Boolean(item.selected), visibleChannels = normalizeChannels(item.visibleChannels);
    const interactionIds = [...new Set((item.interactionIds || []).map(String).filter((id) => id && id !== entityId))].sort((left, right) => left.localeCompare(right));
    return {
      entityId,
      screenX,
      screenY,
      projectedBodyPx: positiveNumber(item.projectedBodyPx, 12, 0, 240),
      panelScale: positiveNumber(item.panelScale, ENTITY_CONSTELLATION_PANEL_SCALE.default, ENTITY_CONSTELLATION_PANEL_SCALE.minimum, ENTITY_CONSTELLATION_PANEL_SCALE.maximum),
      viewportAdmitted: item.viewportAdmitted !== false,
      tier: String(item.tier || "close"),
      selected,
      hovered: Boolean(item.hovered),
      interactionIds,
      interactionIdSet: new Set(interactionIds),
      visibleChannels,
      layoutProfile: normalizeItemLayoutProfile(item.layoutProfile)
    };
  }).sort((left, right) => left.entityId.localeCompare(right.entityId));
  for (let index = 1; index < normalized.length; index += 1) if (normalized[index - 1].entityId === normalized[index].entityId) throw new TypeError(`Duplicate constellation entityId: ${normalized[index].entityId}`);
  return normalized;
};

const findClusters = (items, options) => {
  const count = items.length, parents = Array.from({ length: count }, (_, index) => index);
  const find = (index) => {
    let root = index;
    while (parents[root] !== root) root = parents[root];
    while (parents[index] !== index) { const next = parents[index]; parents[index] = root; index = next; }
    return root;
  };
  const unite = (left, right) => {
    const a = find(left), b = find(right);
    if (a === b) return;
    if (items[a].entityId.localeCompare(items[b].entityId) <= 0) parents[b] = a;
    else parents[a] = b;
  };

  const maximumScale = items.reduce((maximum, item) => Math.max(maximum, item.panelScale), ENTITY_CONSTELLATION_PANEL_SCALE.minimum);
  const maximumFootprint = items.reduce((maximum, item) => Math.max(maximum, item.geometry.footprint.width, item.geometry.footprint.height), 0);
  const maximumRange = Math.max(options.interactionClusterPx * maximumScale, options.overlapPx * maximumScale + maximumFootprint, 1);
  const cellSize = maximumRange;
  const buckets = new Map();
  const keyFor = (x, y) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;

  for (let index = 0; index < count; index += 1) {
    const item = items[index], cellX = Math.floor(item.screenX / cellSize), cellY = Math.floor(item.screenY / cellSize);
    for (let y = cellY - 1; y <= cellY + 1; y += 1) for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      const neighbours = buckets.get(`${x},${y}`) || [];
      for (const otherIndex of neighbours) {
        const other = items[otherIndex], dx = item.screenX - other.screenX, dy = item.screenY - other.screenY, distance = Math.hypot(dx, dy);
        const scale = Math.max(item.panelScale, other.panelScale);
        const horizontalReach = (item.geometry.footprint.width + other.geometry.footprint.width) / 2 + options.overlapPx * scale;
        const verticalReach = (item.geometry.footprint.height + other.geometry.footprint.height) / 2 + options.overlapPx * scale;
        const footprintsOverlap = Math.abs(dx) <= horizontalReach && Math.abs(dy) <= verticalReach;
        recordLayoutMetric("relationIdLookups", 2);
        const explicitlyInteracting = item.interactionIdSet.has(other.entityId) || other.interactionIdSet.has(item.entityId);
        if (footprintsOverlap || explicitlyInteracting && distance <= options.interactionClusterPx * scale) unite(index, otherIndex);
      }
    }
    const key = keyFor(item.screenX, item.screenY);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(index);
  }

  const clusters = new Map();
  for (let index = 0; index < count; index += 1) {
    const root = find(index);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(items[index]);
  }
  return [...clusters.values()].map((cluster) => cluster.sort((left, right) => left.entityId.localeCompare(right.entityId))).sort((left, right) => left[0].entityId.localeCompare(right[0].entityId));
};

const sectorDirection = (cluster, item, centroid, clusterIndexById = null) => {
  const dx = item.screenX - centroid.x, dy = item.screenY - centroid.y, magnitude = Math.hypot(dx, dy);
  if (magnitude > .001) return { x: dx / magnitude, y: dy / magnitude };
  const index = clusterIndexById?.get(item.entityId) ?? cluster.findIndex((candidate) => candidate.entityId === item.entityId);
  const start = cluster.length === 2 ? 0 : -Math.PI / 2;
  const angle = start + Math.PI * 2 * index / Math.max(1, cluster.length);
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

const relativeSlots = (visibleChannels, options, panelScale, itemProfile = null) => {
  const overrides = itemProfile?.slots || options?.slotOverrides?.panel || {};
  const offsets = Object.fromEntries(Object.entries(PANEL_SLOTS).map(([name, offset]) => [name, overrides[name] || offset]));
  const result = {};
  for (const [name, offset] of Object.entries(offsets)) {
    const visible = name === "panel" || visibleChannels.has(name);
    result[name] = freeze({ x: offset.x * panelScale, y: offset.y * panelScale, visible });
  }
  return freeze(result);
};

const normalizedViewportBounds = (value) => {
  if (!value || typeof value !== "object") return null;
  const left = finiteNumber(value.left, 0), top = finiteNumber(value.top, 0), right = finiteNumber(value.right, NaN), bottom = finiteNumber(value.bottom, NaN);
  if (![left, top, right, bottom].every(Number.isFinite) || right <= left || bottom <= top) return null;
  return freeze({ left, top, right, bottom });
};

const normalizedSlotOverrides = (value) => {
  const result = { panel: {} };
  // The fallbacks make save-time/UI migration non-destructive while callers
  // move from the former summary/expanded profile names to `panel`.
  const source = value?.panel || value?.summary || value?.expanded;
  if (source && typeof source === "object") for (const [name, slot] of Object.entries(source)) if (slot && Number.isFinite(Number(slot.x)) && Number.isFinite(Number(slot.y))) result.panel[name] = freeze({ x: Number(slot.x), y: Number(slot.y) });
  freeze(result.panel);
  return freeze(result);
};

const normalizedSlotSizes = (value) => {
  const defaults = { thought: { width: 118, height: 86 }, prediction: { width: 118, height: 86 } };
  const result = {};
  for (const [name, fallback] of Object.entries(defaults)) {
    const source = value?.[name];
    result[name] = freeze({
      width: positiveNumber(source?.width, fallback.width, 0, 4000),
      height: positiveNumber(source?.height, fallback.height, 0, 4000)
    });
  }
  return freeze(result);
};

const normalizedOptions = (options = {}) => Object.freeze({
  overlapPx: positiveNumber(options.overlapPx, 68, 1, 400),
  interactionClusterPx: positiveNumber(options.interactionClusterPx, 150, 1, 800),
  fanDistancePx: positiveNumber(options.fanDistancePx, 46, 1, 400),
  fanStepPx: positiveNumber(options.fanStepPx, 8, 0, 100),
  maximumFanDistancePx: positiveNumber(options.maximumFanDistancePx, 104, 1, 800),
  isolatedOffsetX: finiteNumber(options.isolatedOffsetX, 34),
  isolatedOffsetY: finiteNumber(options.isolatedOffsetY, -26),
  selectedExtraPx: positiveNumber(options.selectedExtraPx, 10, 0, 100),
  ordinaryTetherWidth: positiveNumber(options.ordinaryTetherWidth, 1.2, .25, 12),
  hoveredTetherWidth: positiveNumber(options.hoveredTetherWidth, 2, .25, 12),
  selectedTetherWidth: positiveNumber(options.selectedTetherWidth, 3, .25, 12),
  relatedOpacity: clamp(finiteNumber(options.relatedOpacity, .78), .1, 1),
  unrelatedOpacity: clamp(finiteNumber(options.unrelatedOpacity, .56), .1, 1),
  viewportBounds: normalizedViewportBounds(options.viewportBounds),
  panelWidthPx: positiveNumber(options.panelWidthPx ?? options.summaryWidthPx, 258, 1, 4000),
  panelHeightPx: positiveNumber(options.panelHeightPx ?? options.summaryHeightPx, 86, 1, 4000),
  panelCenterX: finiteNumber(options.panelCenterX ?? options.summaryPanelCenterX, 0),
  panelCenterY: finiteNumber(options.panelCenterY ?? options.summaryPanelCenterY, -5),
  attachmentPaddingPx: positiveNumber(options.attachmentPaddingPx, 0, 0, 400),
  slotSizes: normalizedSlotSizes(options.slotSizes),
  slotOverrides: normalizedSlotOverrides(options.slotOverrides),
  previousOwnership: options.previousOwnership || null
});

const itemPanelGeometry = (item, options) => {
  const scale = item.panelScale, profile = item.layoutProfile;
  const slots = relativeSlots(item.visibleChannels, options, scale, profile);
  const panelWidth = (profile?.panelWidthPx ?? options.panelWidthPx) * scale, panelHeight = (profile?.panelHeightPx ?? options.panelHeightPx) * scale;
  const panelCenterX = (profile?.panelCenterX ?? options.panelCenterX) * scale, panelCenterY = (profile?.panelCenterY ?? options.panelCenterY) * scale;
  const slotSizes = profile?.slotSizes && Object.keys(profile.slotSizes).length ? { ...options.slotSizes, ...profile.slotSizes } : options.slotSizes;
  const attachmentPaddingPx = profile?.attachmentPaddingPx ?? options.attachmentPaddingPx;
  let left = panelCenterX - panelWidth / 2, right = panelCenterX + panelWidth / 2;
  let top = panelCenterY - panelHeight / 2, bottom = panelCenterY + panelHeight / 2;
  for (const [name, size] of Object.entries(slotSizes)) {
    const slot = slots[name];
    // Reserve the cognition pair whenever either attachment is enabled, and
    // retain the selected owner's historical reservation while both are
    // temporarily empty. Appearance must not move the public panel, change
    // collision grouping, or make the tether jump at a viewport edge.
    const cognitionPairRequested = item.selected || item.visibleChannels.has("thought") || item.visibleChannels.has("prediction");
    const reservedForCognitionPair = cognitionPairRequested && (name === "thought" || name === "prediction");
    if ((!slot?.visible && !reservedForCognitionPair) || size.width <= 0 || size.height <= 0) continue;
    const halfWidth = size.width * scale / 2 + attachmentPaddingPx * scale;
    const halfHeight = size.height * scale / 2 + attachmentPaddingPx * scale;
    left = Math.min(left, slot.x - halfWidth); right = Math.max(right, slot.x + halfWidth);
    top = Math.min(top, slot.y - halfHeight); bottom = Math.max(bottom, slot.y + halfHeight);
  }
  return freeze({
    slots,
    panel: { width: panelWidth, height: panelHeight, centerX: panelCenterX, centerY: panelCenterY },
    footprint: { left, top, right, bottom, width: right - left, height: bottom - top, centerX: (left + right) / 2, centerY: (top + bottom) / 2 }
  });
};

/**
 * Resolves projected entities into immutable, entityId-sorted presentation
 * records. `anchorOffset` and every slot are in screen pixels; slots are
 * relative to the common anchor so a renderer can move the constellation as a
 * single unit.
 */
export function resolveEntityConstellations(rawItems = [], rawOptions = {}) {
  if (!Array.isArray(rawItems)) throw new TypeError("resolveEntityConstellations expects an array of projected items");
  const normalized = normalizeItems(rawItems), options = normalizedOptions(rawOptions);
  // Visibility is an explicit projection/frustum decision. Ground-projected
  // body size must not switch surfaces or make a panel appear/disappear when
  // the camera merely tilts.
  const items = normalized.filter((item) => item.viewportAdmitted).map((item) => ({ ...item, detailLevel: item.layoutProfile?.detailLevel || "panel", geometry: itemPanelGeometry(item, options) }));
  if (!items.length) return freeze([]);
  const itemById = new Map(items.map((item) => [item.entityId, item]));
  const clusters = findClusters(items, options);
  const focusIds = new Set(items.filter((item) => item.selected || item.hovered).map((item) => item.entityId));
  const focusClusterIds = new Set(), directlyRelatedToFocus = new Set();
  for (const cluster of clusters) if (cluster.some((item) => focusIds.has(item.entityId))) {
    focusClusterIds.add(cluster[0].entityId);
    for (const item of cluster) directlyRelatedToFocus.add(item.entityId);
  }
  for (const item of items) if (focusIds.has(item.entityId)) for (const relatedId of item.interactionIds) {
    recordLayoutMetric("relationIdLookups");
    if (itemById.has(relatedId)) directlyRelatedToFocus.add(relatedId);
  }
  for (const item of items) {
    let related = false;
    for (const relatedId of focusIds) {
      recordLayoutMetric("relationIdLookups");
      if (item.interactionIdSet.has(relatedId)) { related = true; break; }
    }
    if (related) directlyRelatedToFocus.add(item.entityId);
  }

  const records = [];
  for (const cluster of clusters) {
    const clusterId = cluster[0].entityId;
    let sumX = 0, sumY = 0;
    const clusterMembers = new Array(cluster.length), clusterIndexById = new Map();
    for (let index = 0; index < cluster.length; index += 1) {
      const member = cluster[index]; sumX += member.screenX; sumY += member.screenY;
      clusterMembers[index] = member.entityId; clusterIndexById.set(member.entityId, index);
    }
    const centroid = { x: sumX / cluster.length, y: sumY / cluster.length };
    const ownership = assignClusterOwnership(clusterMembers, options.previousOwnership);
    const styleById = new Map(ownership.map((entry) => [entry.entityId, entry]));
    for (const item of cluster) {
      const focused = item.selected || item.hovered;
      const detailLevel = item.detailLevel;
      const placement = cluster.length > 1 ? "fanned" : "isolated";
      const mode = "panel";
      let direction = sectorDirection(cluster, item, centroid, clusterIndexById);
      let anchorOffset;
      if (cluster.length === 1) {
        anchorOffset = {
          x: (item.layoutProfile?.isolatedOffsetX ?? options.isolatedOffsetX) * item.panelScale,
          y: (item.layoutProfile?.isolatedOffsetY ?? options.isolatedOffsetY) * item.panelScale
        };
        const isolatedMagnitude = Math.hypot(anchorOffset.x, anchorOffset.y);
        direction = isolatedMagnitude > .001 ? { x: anchorOffset.x / isolatedMagnitude, y: anchorOffset.y / isolatedMagnitude } : { x: 1, y: 0 };
      }
      else {
        const baseFanDistance = item.layoutProfile?.fanDistancePx ?? options.fanDistancePx;
        let distance = (baseFanDistance + Math.max(0, cluster.length - 2) * options.fanStepPx + (focused ? options.selectedExtraPx : 0)) * item.panelScale;
        distance = Math.min(distance, options.maximumFanDistancePx * item.panelScale);
        anchorOffset = { x: direction.x * distance, y: direction.y * distance };
      }
      let anchor = { x: item.screenX + anchorOffset.x, y: item.screenY + anchorOffset.y };
      if (options.viewportBounds) {
        const footprint = item.geometry.footprint;
        const minimumX = options.viewportBounds.left - footprint.left, maximumX = options.viewportBounds.right - footprint.right;
        const minimumY = options.viewportBounds.top - footprint.top, maximumY = options.viewportBounds.bottom - footprint.bottom;
        anchor.x = minimumX <= maximumX ? clamp(anchor.x, minimumX, maximumX) : (options.viewportBounds.left + options.viewportBounds.right) / 2;
        anchor.y = minimumY <= maximumY ? clamp(anchor.y, minimumY, maximumY) : (options.viewportBounds.top + options.viewportBounds.bottom) / 2;
        anchorOffset = { x: anchor.x - item.screenX, y: anchor.y - item.screenY };
        const adjustedMagnitude = Math.hypot(anchorOffset.x, anchorOffset.y);
        if (adjustedMagnitude > .001) direction = { x: anchorOffset.x / adjustedMagnitude, y: anchorOffset.y / adjustedMagnitude };
      }
      const length = Math.hypot(anchorOffset.x, anchorOffset.y);
      const opacity = !focusIds.size || focused ? 1 : directlyRelatedToFocus.has(item.entityId) || focusClusterIds.has(clusterId) ? options.relatedOpacity : options.unrelatedOpacity;
      const style = styleById.get(item.entityId);
      const tetherWidth = item.selected ? options.selectedTetherWidth : item.hovered ? options.hoveredTetherWidth : options.ordinaryTetherWidth;
      records.push(freeze({
        entityId: item.entityId,
        clusterId,
        clusterSize: cluster.length,
        clusterMembers,
        mode,
        placement,
        detailLevel,
        projectedBodyPx: item.projectedBodyPx,
        panelScale: item.panelScale,
        viewportAdmitted: item.viewportAdmitted,
        panelDimensions: item.geometry.panel,
        footprint: item.geometry.footprint,
        presentationTier: item.tier,
        style: freeze({ styleIndex: style.styleIndex, accent: style.accent, accentId: style.accentId, shape: style.shape, tetherPattern: style.tetherPattern, dash: [...style.dash] }),
        selected: item.selected,
        hovered: item.hovered,
        dimmed: opacity < 1,
        opacity,
        tetherWidth,
        body: { x: item.screenX, y: item.screenY },
        anchor,
        anchorOffset,
        fanDirection: direction,
        tether: { from: { x: 0, y: 0 }, to: { ...anchorOffset }, length, angle: Math.atan2(anchorOffset.y, anchorOffset.x), width: tetherWidth, pattern: style.tetherPattern, dash: [...style.dash], endpointShape: style.shape },
        slots: item.geometry.slots
      }));
    }
  }
  records.sort((left, right) => left.entityId.localeCompare(right.entityId));
  return freeze(records);
}

const absoluteFootprint = (layout) => {
  const anchorX = finiteNumber(layout?.anchor?.x, NaN), anchorY = finiteNumber(layout?.anchor?.y, NaN);
  const footprint = layout?.footprint;
  if (![anchorX, anchorY, footprint?.left, footprint?.right, footprint?.top, footprint?.bottom].every((value) => Number.isFinite(Number(value)))) return null;
  return freeze({
    left: anchorX + Number(footprint.left),
    right: anchorX + Number(footprint.right),
    top: anchorY + Number(footprint.top),
    bottom: anchorY + Number(footprint.bottom)
  });
};

const paddedRectanglesIntersect = (left, right, padding) => left.left < right.right + padding && left.right > right.left - padding && left.top < right.bottom + padding && left.bottom > right.top - padding;

/**
 * Performs the final visual-admission pass without changing any layout.
 * Complete constellation footprints are ranked from the entity body's
 * distance to the simulation screen centre supplied by the caller. The first
 * panel keeps its authored,
 * camera-following position; every later footprint that intersects it is
 * hidden. Retention is only a small visibility hysteresis, never a positional
 * lock, so a clearly more central entity still takes precedence.
 */
export function suppressOverlappingEntityConstellations(rawLayouts = [], rawOptions = {}) {
  if (!Array.isArray(rawLayouts)) throw new TypeError("suppressOverlappingEntityConstellations expects an array of resolved layouts");
  const viewport = normalizedViewportBounds(rawOptions.viewportBounds);
  if (!viewport) throw new TypeError("suppressOverlappingEntityConstellations requires finite usable viewport bounds");
  const width = viewport.right - viewport.left, height = viewport.bottom - viewport.top;
  const centre = { x: viewport.left + width / 2, y: viewport.top + height / 2 };
  const padding = positiveNumber(rawOptions.paddingPx, 6, 0, 100);
  const retentionBias = positiveNumber(rawOptions.retentionBias, .025, 0, .25);
  const selectedBias = positiveNumber(rawOptions.selectedBias, .06, 0, .2);
  const hoveredBias = positiveNumber(rawOptions.hoveredBias, .015, 0, .2);
  const previousSource = rawOptions.previousVisibleIds;
  const previousVisibleIds = new Set(previousSource instanceof Map ? [...previousSource.keys()].map(String) : previousSource instanceof Set || Array.isArray(previousSource) ? [...previousSource].map(String) : []);
  const seenEntityIds = new Set();
  const candidates = rawLayouts.map((layout) => {
    const entityId = String(layout?.entityId ?? ""), bodyX = Number(layout?.body?.x), bodyY = Number(layout?.body?.y), bounds = absoluteFootprint(layout);
    if (!entityId) throw new TypeError("Every overlap candidate requires a non-empty entityId");
    if (seenEntityIds.has(entityId)) throw new TypeError(`Duplicate overlap candidate entityId: ${entityId}`);
    seenEntityIds.add(entityId);
    if (!Number.isFinite(bodyX) || !Number.isFinite(bodyY) || !bounds) throw new TypeError(`Overlap candidate ${entityId} requires finite body, anchor and footprint coordinates`);
    const normalizedX = (bodyX - centre.x) / Math.max(1, width / 2), normalizedY = (bodyY - centre.y) / Math.max(1, height / 2);
    const centreDistance = Math.hypot(normalizedX, normalizedY), retained = previousVisibleIds.has(entityId);
    const focusBias = layout.selected ? selectedBias : layout.hovered ? hoveredBias : 0;
    return { entityId, layout, bounds, centreDistance, retained, effectiveDistance: centreDistance - focusBias - (retained ? retentionBias : 0) };
  }).sort((a, b) => a.effectiveDistance - b.effectiveDistance || Number(b.layout.selected) - Number(a.layout.selected) || Number(b.layout.hovered) - Number(a.layout.hovered) || a.entityId.localeCompare(b.entityId));

  const admitted = [], decisions = [];
  for (const candidate of candidates) {
    const blocker = admitted.find((accepted) => paddedRectanglesIntersect(candidate.bounds, accepted.bounds, padding));
    if (!blocker) admitted.push(candidate);
    decisions.push(freeze({
      entityId: candidate.entityId,
      admitted: !blocker,
      reason: blocker ? "overlap" : "centre-priority",
      blockingEntityId: blocker?.entityId || null,
      centreDistance: candidate.centreDistance,
      retained: candidate.retained,
      bounds: candidate.bounds
    }));
  }
  const admittedIds = new Set(admitted.map((candidate) => candidate.entityId));
  return freeze({
    candidateCount: candidates.length,
    admittedCount: admittedIds.size,
    suppressedCount: candidates.length - admittedIds.size,
    padding,
    viewportBounds: viewport,
    centre: freeze(centre),
    visibleEntityIds: candidates.filter((candidate) => admittedIds.has(candidate.entityId)).map((candidate) => candidate.entityId),
    suppressedEntityIds: candidates.filter((candidate) => !admittedIds.has(candidate.entityId)).map((candidate) => candidate.entityId),
    decisions: freeze(decisions)
  });
}

const absoluteSlot = (layout, slotName) => {
  const slot = layout?.slots?.[slotName];
  if (!slot?.visible) return null;
  return { x: layout.anchor.x + slot.x, y: layout.anchor.y + slot.y };
};

/**
 * Builds an explicit actor-to-target screen-space arrow. The helper never
 * infers a target: callers must supply both resolved records, which prevents a
 * nearby entity from being presented as a receiver or relational target merely
 * because of proximity.
 */
export function relationalArrow(actorLayout, targetLayout, rawOptions = {}) {
  if (!actorLayout || !targetLayout || actorLayout.entityId === targetLayout.entityId) return null;
  const startSlot = String(rawOptions.startSlot || "action");
  const source = absoluteSlot(actorLayout, startSlot) || actorLayout.anchor;
  const target = targetLayout.body || targetLayout.anchor;
  if (![source?.x, source?.y, target?.x, target?.y].every(Number.isFinite)) return null;
  const rawDx = target.x - source.x, rawDy = target.y - source.y, rawLength = Math.hypot(rawDx, rawDy);
  if (rawLength < 1) return null;
  const direction = { x: rawDx / rawLength, y: rawDy / rawLength };
  const startPadding = Math.min(positiveNumber(rawOptions.startPaddingPx, 4, 0, 100), rawLength * .25);
  const endPadding = Math.min(positiveNumber(rawOptions.endPaddingPx, 12, 0, 100), rawLength * .35);
  const start = { x: source.x + direction.x * startPadding, y: source.y + direction.y * startPadding };
  const end = { x: target.x - direction.x * endPadding, y: target.y - direction.y * endPadding };
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length < 1) return null;
  const headLength = Math.min(positiveNumber(rawOptions.headLengthPx, 9, 2, 40), length * .4), headWidth = headLength * .55;
  const perpendicular = { x: -direction.y, y: direction.x };
  const base = { x: end.x - direction.x * headLength, y: end.y - direction.y * headLength };
  return freeze({
    actorId: actorLayout.entityId,
    targetId: targetLayout.entityId,
    kind: String(rawOptions.kind || "action"),
    startSlot,
    start,
    end,
    direction,
    length,
    angle: Math.atan2(direction.y, direction.x),
    head: { tip: { ...end }, left: { x: base.x + perpendicular.x * headWidth, y: base.y + perpendicular.y * headWidth }, right: { x: base.x - perpendicular.x * headWidth, y: base.y - perpendicular.y * headWidth } },
    style: { accent: actorLayout.style?.accent || "#e8f1ea", pattern: actorLayout.style?.tetherPattern || "solid", dash: [...(actorLayout.style?.dash || [])] }
  });
}
