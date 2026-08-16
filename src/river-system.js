const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const RIVER_FLOW_REGIMES = Object.freeze(["perennial", "intermittent", "ephemeral"]);
export const RIVER_CHANNEL_PATTERNS = Object.freeze(["single-channel", "cascade", "straight", "meandering", "braided", "anastomosing"]);
export const RIVER_SIZE_CLASSES = Object.freeze(["rill", "brook", "creek", "stream", "river", "large-river"]);

const quantile = (sorted, fraction, fallback = 1) => {
  if (!sorted.length) return fallback;
  const position = clamp(fraction, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position), upper = Math.ceil(position), blend = position - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * blend;
};

export function strahlerOrders(channelCells = []) {
  const channels = new Map(channelCells.filter(cell => cell?.channel).map(cell => [cell.id, cell]));
  const memo = new Map();
  const visiting = new Set();
  const orderFor = (cell) => {
    if (memo.has(cell.id)) return memo.get(cell.id);
    if (visiting.has(cell.id)) return 1;
    visiting.add(cell.id);
    const incoming = (cell.neighbours || []).filter(neighbour => channels.has(neighbour.id) && neighbour.flowTo === cell);
    const incomingOrders = incoming.map(orderFor);
    const highest = incomingOrders.length ? Math.max(...incomingOrders) : 1;
    const order = incomingOrders.filter(value => value === highest).length >= 2 ? highest + 1 : highest;
    visiting.delete(cell.id);
    memo.set(cell.id, order);
    return order;
  };
  for (const cell of channels.values()) orderFor(cell);
  return memo;
}

export function riverFlowRegime(cell, settings = {}) {
  const groundwater = clamp((finite(cell?.groundwater) - 4) / 62, 0, 1);
  const humidity = clamp(finite(cell?.humidity, .35), 0, 1);
  const rainfall = clamp(finite(settings.rainfall, 1) / 2, 0, 1);
  const heatPenalty = clamp((finite(cell?.baseTemperature, 14) - 25) / 22, 0, .45);
  const groundwaterSupport = groundwater * .58 + humidity * .17 + rainfall * .25 - heatPenalty;
  const snowSeasonal = finite(cell?.snowPack) > .5 || finite(cell?.baseTemperature, 14) < 3;
  if (groundwaterSupport >= .54 && !snowSeasonal) return "perennial";
  if (groundwaterSupport >= .22 || snowSeasonal) return "intermittent";
  return "ephemeral";
}

export function riverSizeClass(sizeScore) {
  const score = clamp(finite(sizeScore), 0, 1);
  if (score < .12) return "rill";
  if (score < .27) return "brook";
  if (score < .45) return "creek";
  if (score < .64) return "stream";
  if (score < .84) return "river";
  return "large-river";
}

export function riverChannelPattern(cell, context = {}) {
  const diversity = clamp(finite(context.patternDiversity, 1), 0, 2);
  if (diversity === 0) return "single-channel";
  const slope = clamp(finite(cell?.slope), 0, 1);
  const order = Math.max(1, Math.floor(finite(context.streamOrder, 1)));
  const sizeScore = clamp(finite(context.sizeScore), 0, 1);
  const material = String(cell?.parentMaterial || cell?.sediment || cell?.substrate || "loam");
  const sedimentTransport = clamp(finite(context.sedimentTransport, 1), 0, 3);
  const groundwater = finite(cell?.groundwater);
  const stableBanks = finite(cell?.vegetationStability, .5) >= .42 && !["sand", "gravel"].includes(material);
  const mobileBed = ["sand", "gravel", "silt"].includes(material) || sedimentTransport >= 1.35;
  if (slope >= .16 || (material === "bedrock" && slope >= .09)) return "cascade";
  if (sizeScore >= .5 && order >= 2 && slope <= .035 && groundwater >= 35 && stableBanks) return "anastomosing";
  if (sizeScore >= .32 && slope >= .018 && slope <= .16 && mobileBed) return "braided";
  if (sizeScore >= .24 && slope <= .075) return "meandering";
  return "straight";
}

function riverBend(cellId, seed = 0) {
  let value = Math.imul((finite(cellId) + 1) | 0, 0x45d9f3b) ^ (finite(seed) | 0);
  value ^= value >>> 16;
  return ((value >>> 0) / 4294967295) * 2 - 1;
}

export function classifyRiverNetwork(cells = [], options = {}) {
  const channels = cells.filter(cell => cell?.channel && Number.isFinite(cell.meanDischarge) && cell.meanDischarge > 0);
  const flows = channels.map(cell => cell.meanDischarge).sort((left, right) => left - right);
  const qLow = quantile(flows, .05, 1);
  const qHigh = Math.max(qLow * 1.001, quantile(flows, .97, qLow * 1.001));
  const orders = strahlerOrders(channels);
  const maxOrder = Math.max(1, ...orders.values());
  const hexDiameter = Math.max(.001, finite(options.hexDiameter, 1));
  const widthVariation = clamp(finite(options.widthVariation, 1), 0, 2);
  const uniformWidth = hexDiameter * .085;
  const classifications = new Map();
  for (const cell of channels) {
    const streamOrder = orders.get(cell.id) || 1;
    const flowRange = Math.log(qHigh / qLow);
    const flowScore = flowRange > .000001 ? clamp(Math.log(Math.max(qLow, cell.meanDischarge) / qLow) / flowRange, 0, 1) : .5;
    const orderScore = maxOrder > 1 ? (streamOrder - 1) / (maxOrder - 1) : 0;
    const sizeScore = clamp(flowScore * .64 + orderScore * .36, 0, 1);
    const naturalWidth = hexDiameter * (.022 + .62 * Math.pow(sizeScore, 1.45));
    const channelWidth = clamp(uniformWidth + (naturalWidth - uniformWidth) * widthVariation, hexDiameter * .018, hexDiameter * .72);
    const flowRegime = riverFlowRegime(cell, options.settings);
    const pattern = riverChannelPattern(cell, {
      patternDiversity: options.patternDiversity,
      sedimentTransport: options.settings?.sedimentTransport,
      streamOrder,
      sizeScore
    });
    const sizeClass = riverSizeClass(sizeScore);
    classifications.set(cell.id, {
      streamOrder,
      maxOrder,
      flowScore,
      sizeScore,
      sizeClass,
      flowRegime,
      pattern,
      naturalWidth,
      channelWidth,
      bend: riverBend(cell.id, options.seed),
      upstreamChannelCount: (cell.neighbours || []).filter(neighbour => neighbour.channel && neighbour.flowTo === cell).length
    });
  }
  return {
    classifications,
    stats: { qLow, qHigh, maxOrder, hexDiameter, widthVariation, patternDiversity: clamp(finite(options.patternDiversity, 1), 0, 2), miterLimit: 2.5 }
  };
}

export function adjacentLakeMouthCell(lastRiverCell, basin) {
  if (!lastRiverCell || !Array.isArray(basin?.cells)) return null;
  const basinIds = new Set(basin.cells.map(cell => cell.id));
  const adjacent = (lastRiverCell.neighbours || []).filter(cell => basinIds.has(cell.id));
  if (!adjacent.length) return null;
  return adjacent.sort((left, right) => {
    const distance = cell => Math.hypot(finite(cell.x) - finite(lastRiverCell.x), finite(cell.z) - finite(lastRiverCell.z));
    return distance(left) - distance(right) || finite(left.id) - finite(right.id);
  })[0];
}

export function riverDescription(cell) {
  if (!cell?.channel) return "not a river channel";
  const size = String(cell.riverSizeClass || "stream").replaceAll("-", " ");
  const pattern = String(cell.riverPattern || "single-channel").replaceAll("-", " ");
  return `order ${cell.streamOrder || 1} ${cell.flowRegime || "intermittent"} ${pattern} ${size}`;
}
