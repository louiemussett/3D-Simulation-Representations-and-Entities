// One connected axial-hex world. Terrain, hydrology and ecology use these
// same cells; there is no hidden square terrain authority.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n += n << 3; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
const noise = (x, z, seed) => hash(Math.imul(Math.floor(x * 37.1), 73856093) ^ Math.imul(Math.floor(z * 37.1), 19349663) ^ seed);
const smooth = (x, z, seed, scale) => { const gx = x / scale, gz = z / scale, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); const a = noise(ix, iz, seed), b = noise(ix + 1, iz, seed), c = noise(ix, iz + 1, seed), d = noise(ix + 1, iz + 1, seed); return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz; };
const fbm = (x, z, seed) => smooth(x, z, seed, 75) * .55 + smooth(x, z, seed + 19, 31) * .3 + smooth(x, z, seed + 41, 12) * .15;
const axialKey = (q, r) => `${q},${r}`;
const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const windVector = (direction = 'west') => ({ west: [1, 0], southwest: [.707, -.707], south: [0, -1], southeast: [-.707, -.707], east: [-1, 0] }[direction] || [1, 0]);

export class HexWorld {
  constructor(seed, settings) {
    this.seed = seed >>> 0; this.size = settings.size; this.half = settings.size / 2; this.settings = settings;
    this._seasonalTemperature = settings.startSeason === 'Winter' ? -7 : settings.startSeason === 'Summer' ? 5 : settings.startSeason === 'Autumn' ? -2 : 1;
    this.target = Math.max(500, Math.round((settings.hexDetail || 5000) * (settings.size / 300) ** 2));
    this.radius = Math.sqrt((this.size * this.size) / (this.target * 2.598076));
    this.cells = []; this.byAxial = new Map(); this.buckets = new Map(); this.basins = []; this.waterBodies = []; this.riverRoutes = []; this.riverWidthStats = null; this.riverDiagnostics = []; this.woodyInitialised = false;
    this.hexArea = 2.598076 * this.radius * this.radius;
    this.boundary = { id: 'boundary', dailyInflow: 0, exportedVolume: 0 };
    this._makeCells(); this._elevate(); this._link(); this._deriveSubstrate(); this._deriveClimate(); this._prepareDrainage();
    // Warm the slow water and channel state before the first visible render.
    // The visible world is therefore a solved daily state, never a second pass.
    for (let i = 0; i < 120; i++) this._hydrologyStep(1, true);
    this._finaliseChannels(); this._cacheRiverWidths();
    this._hydrologyStep(1, false);
    this._deriveEcology(); this._indexBuckets();
  }
  _makeCells() {
    const r = this.radius, row = 1.5 * r, col = Math.sqrt(3) * r, rows = Math.ceil(this.size / row) + 4, cols = Math.ceil(this.size / col) + 4;
    for (let rr = -rows; rr <= rows; rr++) for (let q = -cols; q <= cols; q++) {
      const x = col * (q + rr / 2), z = row * rr;
      if (x < -this.half - r || x > this.half + r || z < -this.half - r || z > this.half + r) continue;
      const c = { id: this.cells.length, q, r: rr, x, z, elevation: 0, slope: 0, soilDepth: 0, baseSoilDepth: 0, soilRetention: .6, aeolianPotential: 0, windExposure: 0, windShelter: 0, windChannel: 0, parentMaterial: 'loam', fertility: 0, moisture: 0, ecoMoisture: 0, humidity: 0, temperature: 0, baseTemperature: 0, snowPack: 0, soilWater: 55, groundwater: 38, runoff: 0, discharge: 0, meanDischarge: 0, peakDischarge: 0, channelStrength: 0, channel: false, channelWidthRaw: 0, channelWidth: 0, waterWidth: 0, upstreamChannelCount: 0, routingRank: 0, incoming: 0, localRunoff: 0, accumulation: 1, drainage: 0, waterDepth: 0, waterLevel: 0, waterSurface: null, waterBodyId: null, terrainClass: 'grassland', landCover: 'shortGrass', plantType: 'grass', biomass: 0, grassBiomass: 0, grassHeight: 0, shrubBiomass: 0, woodyCover: 0, canopyCover: 0, shrubland: false, woodland: false, woodlandSuitability: 0, woodyStage: 'none', vegetationAgeDays: 0, vegetationStage: 'bare', leaflessTreeUntil: 0, fallenTreeUntil: 0, wetland: false, rocky: false, sandy: false, drinkable: false, scent: null, neighbours: [], flowTo: null, filled: 0, basinId: null, lakeBasin: false, permanentWater: false, water: false, waterChannel: false, dryChannel: false, floodplain: false, riparian: false, sediment: 'loam', shoreExposure: 0, floodFrequency: 0, daysWet: 0, daysDry: 0, vegetationStability: .5, plantAge: 0, plantStage: 'mature', seedStore: 0, substrate: 'loam' };
      this.cells.push(c); this.byAxial.set(axialKey(q, rr), c);
    }
  }
  _elevate() {
    const s = this.settings, relief = s.relief || 0, rng = (i) => hash(this.seed ^ Math.imul(i + 1, 2654435761)), features = [];
    const count = Math.max(1, Math.round((s.mountains + s.hills + s.valleys) * 2.4));
    for (let i = 0; i < count; i++) { const kind = i % 3 === 0 ? 'mountain' : i % 3 === 1 ? 'hill' : 'valley'; const angle = rng(i * 3) * Math.PI, cx = (rng(i * 3 + 1) - .5) * this.size * .78, cz = (rng(i * 3 + 2) - .5) * this.size * .78; features.push({ kind, cx, cz, angle, length: this.size * (.12 + rng(i + 48) * .23), width: this.size * (.055 + rng(i + 91) * .12), amp: kind === 'mountain' ? 34 * s.mountains : kind === 'hill' ? 11 * s.hills : -15 * s.valleys }); }
    for (const c of this.cells) { let e = ((c.x / this.size) * 3.3 + fbm(c.x, c.z, this.seed) * 7 - 3.5) * relief; for (const f of features) { const dx = c.x - f.cx, dz = c.z - f.cz, ca = Math.cos(f.angle), sa = Math.sin(f.angle), u = (dx * ca + dz * sa) / f.length, v = (-dx * sa + dz * ca) / f.width; e += f.amp * Math.exp(-(u * u + v * v) * 2.2) * relief; } c.elevation = relief === 0 ? 0 : e; }
  }
  _link() {
    for (const c of this.cells) c.neighbours = dirs.map(([dq, dr]) => this.byAxial.get(axialKey(c.q + dq, c.r + dr))).filter(Boolean);
    for (const c of this.cells) { const avg = c.neighbours.reduce((n, other) => n + other.elevation, 0) / Math.max(1, c.neighbours.length); c.slope = clamp(Math.abs(c.elevation - avg) / Math.max(1, this.radius * .9), 0, 1); }
  }
  _deriveSubstrate() {
    // Parent material is fixed at world generation. It controls the soil which
    // weather and ecology later act upon; it is not a daily colour choice.
    const [windX, windZ] = windVector(this.settings.windDirection);
    const windStrength = this.settings.windStrength ?? 1, sedimentTransport = this.settings.sedimentTransport ?? 1;
    for (const c of this.cells) {
      const broadDeposit = smooth(c.x + 1100, c.z - 760, this.seed + 821);
      const fineDeposit = smooth(c.x - 640, c.z + 980, this.seed + 907);
      const upwindRise = c.neighbours.reduce((sum, n) => {
        const dx = n.x - c.x, dz = n.z - c.z;
        return sum + (dx * windX + dz * windZ < 0 ? Math.max(0, n.elevation - c.elevation) : 0);
      }, 0) / Math.max(1, c.neighbours.length * this.radius);
      const valleyChannel = clamp((c.neighbours.reduce((sum, n) => sum + n.elevation, 0) / Math.max(1, c.neighbours.length) - c.elevation) / Math.max(1, this.radius * .42), 0, 1);
      const exposedLowland = clamp((1 - c.slope * 3.4) * (.35 + broadDeposit * .65) * (1 - upwindRise * .7), 0, 1);
      c.windExposure = clamp(exposedLowland * windStrength, 0, 1);
      c.windShelter = clamp(upwindRise * 1.4 + (1 - exposedLowland) * .22, 0, 1);
      c.windChannel = clamp(valleyChannel * windStrength, 0, 1);
      let parent = 'loam';
      if (c.slope > .45 || c.elevation > 25) parent = 'bedrock';
      else if (c.slope > .24 || c.elevation > 15) parent = 'gravel';
      else if (c.slope < .14 && (exposedLowland * sedimentTransport + valleyChannel * .42 * sedimentTransport) > .72) parent = 'sand';
      else if (c.slope < .11 && fineDeposit > .62) parent = 'silt';
      const properties = {
        bedrock: { depth: .06, retention: .12 }, gravel: { depth: .22, retention: .27 },
        sand: { depth: .34, retention: .22 }, loam: { depth: .68, retention: .62 },
        silt: { depth: .82, retention: .78 }
      }[parent];
      c.parentMaterial = c.substrate = parent;
      c.baseSoilDepth = properties.depth;
      c.soilDepth = properties.depth;
      c.soilRetention = properties.retention;
      c.aeolianPotential = exposedLowland;
      c.soilWater = clamp(20 + properties.retention * 74, 8, 88);
      c.groundwater = clamp(12 + properties.retention * 44, 6, 62);
    }
  }
  _deriveClimate() {
    const s = this.settings, contrast = s.temperatureVariation ?? 1, latitudeStrength = s.climate ?? 1;
    const northTemperature = s.northTemperature ?? 8, southTemperature = s.southTemperature ?? 24;
    const coldestTemperature = s.coldestTemperature ?? -12, hottestTemperature = s.hottestTemperature ?? 36;
    for (const c of this.cells) {
      const latitude = (c.z + this.half) / this.size;
      // A temperate mean is retained. Contrast creates broad warmer and cooler
      // regions in the same world; it is not a global desert/snow switch.
      const regional = (fbm(c.x + 410, c.z - 260, this.seed + 311) - .5) * 18 * contrast;
      const latitudeBase = northTemperature + (southTemperature - northTemperature) * latitude;
      const latitudeBand = (latitude - .5) * (southTemperature - northTemperature) * (latitudeStrength - 1);
      c.baseTemperature = clamp(latitudeBase + latitudeBand + regional - c.elevation * (.42 + contrast * .10), coldestTemperature, hottestTemperature);
      c.temperature = c.baseTemperature;
      const humidRegion = fbm(c.x - 560, c.z + 730, this.seed + 613) - .5;
      // Warm low ground supplies atmospheric moisture. Wind later transports it
      // across the connected hexes; high exposed land is colder and drier.
      const evaporationSource = clamp((c.baseTemperature - 12) / 24, 0, 1) * (1 - c.slope * .45);
      c.humidity = clamp(.32 + humidRegion * (.18 + contrast * .10) + evaporationSource * .36 - Math.max(0, regional) * .012, .05, .95);
      c.groundwater = clamp(8 + c.soilRetention * 42 + (1 - c.slope) * 14 + s.rainfall * 7 + c.humidity * 9, 5, 85);
      c.soilWater = clamp(10 + c.soilRetention * 62 + (1 - c.slope) * 14 + c.humidity * 8, 6, 90);
      c.snowPack = c.temperature < -1 ? (-c.temperature) * 3.5 : 0;
    }
  }
  _prepareDrainage() {
    // Priority flood is auxiliary routing geometry. It never alters elevation.
    const edge = c => Math.abs(c.x) > this.half - this.radius * 2 || Math.abs(c.z) > this.half - this.radius * 2;
    const queue = [], seen = new Set(); let rank = 0;
    const push = (c, h, parent = null) => { queue.push({ c, h, parent }); queue.sort((a, b) => a.h - b.h || a.c.id - b.c.id); };
    for (const c of this.cells.filter(edge)) { seen.add(c.id); c.filled = c.elevation; c.routingRank = rank++; c.routingParent = null; push(c, c.filled); }
    while (queue.length) { const { c, h } = queue.shift(); for (const n of c.neighbours) if (!seen.has(n.id)) { seen.add(n.id); n.filled = Math.max(n.elevation, h); n.routingRank = rank++; n.routingParent = c; push(n, n.filled, c); } }
    const candidates = new Set(this.cells.filter(c => c.filled > c.elevation + .12).map(c => c.id)); let n = 0;
    while (candidates.size) {
      const first = this.cells[candidates.values().next().value], stack = [first], cells = []; candidates.delete(first.id);
      while (stack.length) { const c = stack.pop(); cells.push(c); for (const x of c.neighbours) if (candidates.delete(x.id)) stack.push(x); }
      if (cells.length < 3) continue;
      const rimEdges = cells.flatMap(c => c.neighbours.filter(x => !cells.includes(x)).map(x => ({ inside: c, outside: x })));
      const spill = rimEdges.sort((a, b) => a.outside.filled - b.outside.filled || a.outside.routingRank - b.outside.routingRank)[0];
      if (!spill) continue;
      const levels = [...new Set(cells.map(c => c.elevation).concat(spill.outside.filled).sort((a, b) => a - b))];
      const basin = { id: `basin-${n++}`, cells, floor: levels[0], rim: spill.outside.filled, spillInside: spill.inside, spillOutside: spill.outside, level: levels[0], volume: 0, capacity: 0, dailyInflow: 0, dailyOverflow: 0, levels, stage: [] };
      for (const level of levels) basin.stage.push({ level, volume: cells.reduce((v, c) => v + Math.max(0, level - c.elevation) * this.hexArea, 0) });
      basin.capacity = basin.stage[basin.stage.length - 1].volume;
      for (const c of cells) { c.basinId = basin.id; c.lakeBasin = true; c.flowTo = basin; }
      this.basins.push(basin);
    }
    for (const c of this.cells.filter(c => !c.lakeBasin)) {
      c.drainage = clamp((c.filled - c.elevation) / Math.max(1, this.radius), 0, 1);
      const basin = c.neighbours.filter(x => x.lakeBasin && x.filled <= c.filled + .0001).sort((a, b) => a.filled - b.filled)[0];
      const parent = c.routingParent;
      c.flowTo = basin ? this.basins.find(b => b.id === basin.basinId) : parent?.lakeBasin ? this.basins.find(b => b.id === parent.basinId) : parent || this.boundary;
    }
    this.topology = [...this.cells].filter(c => !c.lakeBasin).sort((a, b) => b.routingRank - a.routingRank || b.id - a.id);
  }
  _resetDaily() { this.boundary.dailyInflow = 0; for (const b of this.basins) { b.dailyInflow = 0; b.dailyOverflow = 0; } for (const c of this.cells) { c.water = false; c.waterChannel = false; c.dryChannel = c.channel; c.permanentWater = false; c.waterBodyId = null; c.waterDepth = 0; c.waterLevel = 0; c.waterSurface = null; c.runoff = c.localRunoff = c.incoming = c.discharge = 0; } }
  _levelFor(basin, volume) { let lo = basin.floor, hi = basin.rim; for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2, v = basin.cells.reduce((sum, c) => sum + Math.max(0, mid - c.elevation) * this.hexArea, 0); if (v < volume) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  _routeOverflow(start, volume) { let c = start, guard = 0; while (c && volume > 0 && guard++ < this.cells.length) { if (c.lakeBasin) { const b = this.basins.find(x => x.id === c.basinId); b.dailyInflow += volume; return; } c.incoming += volume; c.discharge += volume; const next = c.flowTo; if (next === this.boundary || !next) { this.boundary.dailyInflow += volume; return; } if (next?.cells) { next.dailyInflow += volume; return; } c = next; } }
  _solveBasin(basin, rainMm, evapMm) {
    const priorArea = basin.cells.reduce((a, c) => a + (c.waterDepth > 0 ? this.hexArea : 0), 0);
    const directRain = rainMm / 1000 * priorArea, evaporation = evapMm / 1000 * priorArea, seep = Math.min(basin.volume, priorArea * .00025);
    const provisional = Math.max(0, basin.volume + basin.dailyInflow + directRain - evaporation - seep);
    basin.dailyOverflow = Math.max(0, provisional - basin.capacity); basin.volume = Math.min(basin.capacity, provisional); basin.level = this._levelFor(basin, basin.volume);
    if (basin.dailyOverflow) this._routeOverflow(basin.spillOutside, basin.dailyOverflow);
  }
  _hydrologyStep(days, warming = false, weather = null) {
    const s = this.settings, rainfallScale = Math.max(.1, s.rainfall || 1), seasonTemp = warming ? 0 : (this._seasonalTemperature || 0), [windX, windZ] = windVector(s.windDirection), windStrength = s.windStrength ?? 1, rainShadow = s.rainShadow ?? 1, stormFactor = weather?.stormFactor ?? 0; this._resetDaily();
    let rainMm = 0, evapMm = 0;
    const transportedHumidity = new Map();
    for (const c of this.cells) {
      const upwind = c.neighbours.slice().sort((a, b) => ((a.x - c.x) * windX + (a.z - c.z) * windZ) - ((b.x - c.x) * windX + (b.z - c.z) * windZ))[0];
      const carried = upwind ? upwind.humidity : c.humidity;
      transportedHumidity.set(c.id, clamp(c.humidity * (1 - .22 * windStrength) + carried * (.22 * windStrength), .03, .98));
    }
    for (const c of this.cells) {
      c.humidity = transportedHumidity.get(c.id);
      c.temperature = c.baseTemperature + seasonTemp;
      const upwind = c.neighbours.slice().sort((a, b) => ((a.x - c.x) * windX + (a.z - c.z) * windZ) - ((b.x - c.x) * windX + (b.z - c.z) * windZ))[0];
      const downwind = c.neighbours.slice().sort((a, b) => ((b.x - c.x) * windX + (b.z - c.z) * windZ) - ((a.x - c.x) * windX + (a.z - c.z) * windZ))[0];
      const uplift = Math.max(0, c.elevation - (upwind?.elevation ?? c.elevation)) / Math.max(1, this.radius);
      const leeDrop = Math.max(0, c.elevation - (downwind?.elevation ?? c.elevation)) / Math.max(1, this.radius);
      const precipitation = clamp((1.5 + c.humidity * 6.2 + uplift * 6.5 * rainShadow + stormFactor * 11) * rainfallScale * days, .05, 24);
      c.humidity = clamp(c.humidity - uplift * .16 * rainShadow + Math.max(0, c.temperature - 16) * .002 - leeDrop * .06 * rainShadow, .04, .98);
      const snowFraction = clamp((1 - c.temperature) / 2, 0, 1); const snowfall = precipitation * snowFraction, liquid = precipitation - snowfall;
      const melt = Math.min(c.snowPack, Math.max(0, c.temperature) * 2.1 * days); c.snowPack = Math.max(0, c.snowPack + snowfall - melt - Math.min(c.snowPack, .04 * days));
      const surface = liquid + melt, capacity = clamp(3 + c.soilRetention * 24 - c.slope * 12 + c.soilDepth * 7, 2, 32), soilRoom = Math.max(0, 115 - c.soilWater), infiltration = Math.min(surface, capacity, soilRoom); const quick = Math.max(0, surface - infiltration);
      const potentialET = Math.max(0, c.temperature - 3) * .34 * days; c.soilWater += infiltration; const soilET = Math.min(c.soilWater, potentialET * (c.woodland ? 1.25 : .9)); const percolation = Math.max(0, c.soilWater - (42 + c.soilRetention * 48)) * (.12 - c.soilRetention * .06); c.soilWater = Math.max(0, c.soilWater - soilET - percolation); c.groundwater += percolation; const baseflow = Math.min(c.groundwater, c.groundwater * (.018 + (1 - c.soilRetention) * .018) * days); c.groundwater -= baseflow;
      c.localRunoff = (quick + baseflow) / 1000 * this.hexArea; c.runoff = c.localRunoff; c.humidity = clamp(c.humidity + soilET * .004 - precipitation * .002, .04, .98); rainMm += liquid; evapMm += soilET;
    }
    for (const c of this.topology) { c.discharge += c.localRunoff + c.incoming; const to = c.flowTo; if (to === this.boundary) this.boundary.dailyInflow += c.discharge; else if (to?.cells) to.dailyInflow += c.discharge; else if (to) to.incoming += c.discharge; }
    for (const b of this.basins) this._solveBasin(b, rainMm / this.cells.length, evapMm / this.cells.length);
    this.waterBodies = []; for (const b of this.basins) { const flooded = b.cells.filter(c => c.elevation < b.level - .001); if (flooded.length) { const id = `lake-${b.id}`; for (const c of flooded) { c.water = c.permanentWater = true; c.waterBodyId = id; c.waterSurface = b.level; c.waterDepth = Math.max(0, b.level - c.elevation); c.waterLevel = c.waterDepth; } this.waterBodies.push({ id, cells: flooded, level: b.level, type: 'lake', rim: b.rim }); } }
    for (const c of this.cells) { c.meanDischarge = warming ? c.meanDischarge * .975 + c.discharge * .025 : c.meanDischarge * .992 + c.discharge * .008; c.peakDischarge = Math.max(c.peakDischarge * .985, c.discharge); }
    this._applyChannelWater();
  }
  _finaliseChannels() {
    const scale = Math.max(.15, this.settings.rivers || 1);
    const land = this.cells.filter(c => !c.lakeBasin && c.flowTo && c.flowTo !== this.boundary);
    const indexAt = (c) => {
      const resistance = 1 + c.slope * 2.2 + (c.rocky ? .7 : 0);
      return c.meanDischarge * Math.sqrt(Math.max(.02, c.slope)) / resistance;
    };
    const ranked = land.map(indexAt).sort((a, b) => a - b);
    // The formation threshold selects only the persistent upper tail of the
    // accumulated-flow field. It never exposes the complete drainage graph.
    const quantile = clamp(.992 - scale * .011, .955, .99);
    const threshold = ranked[Math.floor((ranked.length - 1) * quantile)] || Infinity;
    const score = new Map(land.map(c => [c.id, indexAt(c)]));
    for (const c of this.cells) { c.channel = false; c.channelStrength = clamp((score.get(c.id) || 0) / Math.max(threshold, .000001), 0, 1); }
    const heads = land.filter(c => score.get(c.id) >= threshold && !c.neighbours.some(n => n.flowTo === c && (score.get(n.id) || 0) >= threshold));
    this.riverRoutes = []; let id = 0; const claimed = new Set();
    for (const head of heads.sort((a, b) => (score.get(b.id) || 0) - (score.get(a.id) || 0))) {
      const cells = []; let c = head, guard = 0;
      while (c && !claimed.has(c.id) && guard++ < this.cells.length) {
        claimed.add(c.id); c.channel = true; cells.push(c);
        const next = c.flowTo;
        if (!next || next === this.boundary || next?.cells) break;
        c = next;
      }
      if (cells.length > 1) this.riverRoutes.push({ id: `river-${id++}`, cells, source: head.id, discharge: head.meanDischarge });
    }
  }
  _cacheRiverWidths() {
    const flows = this.cells.filter(c => c.channel && Number.isFinite(c.meanDischarge) && c.meanDischarge > 0).map(c => c.meanDischarge).sort((a, b) => a - b);
    const pick = (q) => flows[Math.min(flows.length - 1, Math.max(0, Math.floor((flows.length - 1) * q)))] || 1;
    const qLow = pick(.10), qHigh = Math.max(qLow * 1.001, pick(.95));
    this.riverWidthStats = { qLow, qHigh, hexDiameter: this.radius * 2, miterLimit: 2.5 };
    for (const c of this.cells) if (c.channel) {
      const t = clamp(Math.log(Math.max(c.meanDischarge, qLow) / qLow) / Math.log(qHigh / qLow), 0, 1);
      c.channelWidthRaw = this.riverWidthStats.hexDiameter * (.05 + .27 * Math.pow(t, .75));
      c.channelWidth = c.channelWidthRaw;
      c.upstreamChannelCount = c.neighbours.filter(n => n.channel && n.flowTo === c).length;
    }
  }
  _applyChannelWater() {
    this.riverDiagnostics = [];
    for (const route of this.riverRoutes) {
      const dryGaps = []; let wetBefore = false, dryStart = -1;
      for (let i = 0; i < route.cells.length; i++) {
        const c = route.cells[i], visible = c.discharge > this.hexArea * .00045;
        c.dryChannel = !visible; const bankfull = Math.max(this.riverWidthStats?.qLow || 1, c.meanDischarge * 1.15); const flowRatio = clamp(c.discharge / bankfull, 0, 1);
        c.waterWidth = visible ? c.channelWidth * (.25 + .75 * Math.sqrt(flowRatio)) : 0;
        if (!visible) { if (wetBefore && dryStart < 0) dryStart = i; continue; }
        if (dryStart >= 0) { dryGaps.push({ from: dryStart, to: i - 1 }); dryStart = -1; }
        wetBefore = true; if (c.water) continue;
        c.water = c.waterChannel = true; c.waterBodyId = route.id; c.waterDepth = clamp(.025 + Math.sqrt(c.discharge / Math.max(1, this.hexArea)) * .07, .025, .22); c.waterLevel = c.waterDepth; c.waterSurface = c.elevation + .016;
      }
      this.riverDiagnostics.push({ id: route.id, dryGaps, cells: route.cells.map(c => ({ id: c.id, currentDischarge: c.discharge, effectiveDischarge: c.meanDischarge, rawChannelWidth: c.channelWidthRaw, channelWidth: c.channelWidth, waterWidth: c.waterWidth, upstreamChannelCount: c.upstreamChannelCount, wet: c.waterChannel })) });
    }
  }
  _deriveEcology() {
    const s = this.settings;
    const initialiseWoody = !this.woodyInitialised, woodlandCandidates = [], shrubCandidates = [];
    for (const c of this.cells) {
      const waterNeighbours = c.neighbours.filter(n => n.water);
      const adjacentWater = waterNeighbours.length > 0;
      const lakeAdjacent = waterNeighbours.some(n => n.waterBodyId?.startsWith('lake-'));
      const localFlow = c.waterChannel ? c.discharge : Math.max(0, ...waterNeighbours.map(n => n.discharge || 0));
      const windExposure = clamp(c.windExposure + c.windChannel * .28 - c.windShelter * .22, 0, 1);
      const waterNow = c.water || adjacentWater;
      c.daysWet = c.water ? c.daysWet + 1 : 0;
      c.daysDry = c.water ? 0 : c.daysDry + 1;
      c.floodFrequency = clamp(c.floodFrequency * .94 + (waterNow ? .1 : 0), 0, 1);
      c.shoreExposure = windExposure;
      c.rocky = c.parentMaterial === 'bedrock' || c.slope > .48 || (c.elevation > 20 && c.baseSoilDepth < .28);
      // Keep the generated parent material authoritative. Basins can collect a
      // little additional alluvium, but daily ecology must not reset all land
      // back to the same loam-like soil depth.
      c.soilDepth = clamp(c.baseSoilDepth + (c.lakeBasin ? .12 : 0) + (c.floodFrequency > .25 ? .08 : 0), .03, 1);
      // Hydrology stores water amounts in millimetre-like units.  Convert them
      // to an ecological 0–1 availability index before vegetation uses them.
      // Treating raw groundwater (normally 8–85) as a fraction made every land
      // hex fully wet and therefore eligible for forest.
      const soilMoisture = clamp(c.soilWater / 115, 0, 1);
      const groundwaterMoisture = clamp(c.groundwater / 120, 0, 1);
      const flowMoisture = clamp(c.discharge / Math.max(this.hexArea * .009, .0001), 0, 1);
      c.ecoMoisture = clamp(soilMoisture * .55 + groundwaterMoisture * .35 + flowMoisture * .10, 0, 1);
      c.moisture = clamp(c.ecoMoisture + (c.water ? .5 : 0), 0, 1);
      const highEnergy = clamp(c.slope * .75 + Math.min(.5, localFlow * 1.8) + (lakeAdjacent ? windExposure * .3 : 0), 0, 1);
      const fineSediment = clamp((1 - highEnergy) * (1 - c.slope) * (c.moisture + .15), 0, 1);
      c.sediment = c.rocky || highEnergy > .72 ? 'rock' : highEnergy > .48 ? 'gravel' : c.parentMaterial === 'sand' ? 'sand' : fineSediment > .6 || c.parentMaterial === 'silt' ? 'silt' : 'loam';
      // Sand needs an exposed, low-slope depositional shore or a genuinely dry,
      // coarse former channel. Merely touching a stream is no longer enough.
      // Sand is not just a shore material: hot, persistently dry, low-slope
      // terrain loses fine organic cover and becomes naturally sandy too.
      const aridSand = c.parentMaterial === 'sand' && c.temperature >= 21 && c.ecoMoisture < .46 && c.floodFrequency < .12;
      c.sandy = !c.water && c.slope < .16 && ((lakeAdjacent && windExposure > .62 && c.sediment === 'gravel') || (c.dryChannel && c.daysDry > 5 && c.sediment === 'gravel') || aridSand);
      c.wetland = !c.water && !c.sandy && c.slope < .13 && c.moisture > .64 && (c.floodFrequency > .2 || (lakeAdjacent && windExposure < .46));
      c.vegetationStability = clamp(c.vegetationStability + (!c.water && !c.sandy && !c.rocky ? .008 : -.035), 0, 1);
      // The setting controls maximum established cover, not simply one wetness
      // cutoff.  Broad seeded variation forms coherent potential woodland
      // areas while unsuitable land remains grassland.
      const climateSuitability = clamp(1 - Math.abs(c.temperature - 12) / 18, 0, 1);
      const seedSuitability = fbm(c.x + 900, c.z - 700, this.seed + 67);
      const suitable = !c.water && !c.rocky && !c.sandy && !c.wetland && c.slope < .21 && c.soilDepth > .46 && c.ecoMoisture > .42 && c.vegetationStability >= .5 && climateSuitability > .42;
      c.woodlandSuitability = suitable ? (.31 * c.ecoMoisture + .24 * c.soilDepth + .18 * climateSuitability + .17 * c.vegetationStability + .10 * seedSuitability) : -Infinity;
      if (initialiseWoody && suitable) woodlandCandidates.push(c);
      // Scrub has a wider ecological niche than forest: it can persist on
      // thinner, drier or more disturbed ground, but never in open water,
      // wetlands, exposed rock, or mobile sand.
      const scrubSuitable = !c.water && !c.rocky && !c.sandy && !c.wetland && c.slope < .34 && c.soilDepth > .22 && c.ecoMoisture > .20 && climateSuitability > .24;
      if (initialiseWoody && scrubSuitable) shrubCandidates.push(c);
      if (initialiseWoody) c.woodland = false;
    }

    // Default cover is 15% of land; the setup value spans 0%–30%.  Select the
    // best established sites globally, keeping forest a constrained outcome
    // rather than the fallback for all moist ground.
    if (initialiseWoody) {
      const landCount = this.cells.filter(c => !c.water && !c.rocky).length;
      const targetWoodland = Math.round(landCount * clamp((s.woodland ?? 1) * .15, 0, .30));
      woodlandCandidates.sort((a, b) => b.woodlandSuitability - a.woodlandSuitability || a.id - b.id);
      for (let i = 0; i < Math.min(targetWoodland, woodlandCandidates.length); i++) {
        const c = woodlandCandidates[i], age = 45 + hash(c.id ^ this.seed) * 900;
        c.woodland = true; c.plantAge = age;
        c.woodyStage = age > 720 ? 'matureTree' : age > 180 ? 'youngTree' : 'shrub';
        c.plantType = c.woodyStage === 'shrub' ? 'shrub' : 'tree';
      }
      // Natural scrub is separate from woodland: it occupies suitable but less
      // stable sites and provides browse/cover without becoming a tree canopy.
      const shrubTarget = Math.round(landCount * clamp((s.bushes ?? 1) * .13, 0, .24));
      const scrub = shrubCandidates.filter(c => !c.woodland).sort((a, b) => {
        const score = (c) => c.ecoMoisture * .36 + c.soilDepth * .23 + (1 - c.slope) * .14 + c.vegetationStability * .12 + noise(c.x, c.z, this.seed + 101) * .15;
        return score(b) - score(a) || a.id - b.id;
      });
      for (let i = 0; i < Math.min(shrubTarget, scrub.length); i++) {
        const c = scrub[i]; c.shrubland = true; c.woodyStage = 'shrub'; c.plantType = 'shrub'; c.plantAge = 30 + hash(c.id ^ (this.seed + 101)) * 420;
      }
      this.woodyInitialised = true;
    }

    for (const c of this.cells) {
      if (initialiseWoody && !c.woodland && !c.shrubland) c.plantType = 'grass';
      if (initialiseWoody) c.biomass = c.water || c.rocky || c.sandy ? 0 : clamp(.12 + c.soilDepth * .42 + c.moisture * .45, 0, c.woodland ? 1.2 : 1);
      else if (c.water || c.rocky || c.sandy) c.biomass = 0;
      c.shrubBiomass = c.plantType === 'shrub' ? c.biomass : 0;
      c.grassBiomass = c.plantType === 'grass' ? c.biomass : 0;
      c.vegetationAgeDays = c.plantAge;
      c.vegetationStage = c.water || c.rocky || c.sandy ? 'bare' : c.woodland && c.woodyStage === 'matureTree' ? 'matureForest' : c.woodland ? 'youngWoodland' : c.shrubland ? 'scrub' : c.biomass > .12 ? 'grass' : 'bare';
      c.woodyCover = c.woodland ? (c.plantType === 'tree' ? .78 : .48) : c.shrubland ? .36 : 0;
      c.canopyCover = c.woodland && c.plantType === 'tree' && c.woodyStage === 'matureTree' ? .8 : c.plantType === 'tree' ? .42 : 0;
      if (initialiseWoody) c.grassHeight = c.woodland ? 0 : clamp(c.biomass * s.longGrass, 0, 1);
      c.drinkable = c.water;
      const snowy = c.snowPack > .12 || c.temperature < -3;
      c.terrainClass = c.water ? (c.waterDepth > .45 ? 'deepWater' : 'shallowWater') : snowy ? 'snow' : c.rocky ? 'rock' : c.sandy ? 'sand' : c.dryChannel && c.daysDry < 14 ? (c.sediment === 'silt' ? 'dirt' : 'sand') : c.wetland ? 'wetland' : c.woodland ? 'woodland' : c.shrubland ? 'shrubland' : c.temperature > 28 && c.ecoMoisture < .42 ? 'dirt' : c.temperature > 22 && c.ecoMoisture < .58 ? 'dryGrass' : c.biomass < .18 ? 'dirt' : 'grassland';
      c.landCover = c.water ? (c.waterDepth > .45 ? 'deepLake' : c.waterChannel ? 'river' : 'shallowPond') : snowy ? 'snow' : c.rocky ? (c.elevation > 12 ? 'alpineRock' : 'rock') : c.wetland ? (c.floodFrequency > .55 ? 'swamp' : 'wetMeadow') : c.lakeBasin && c.daysDry < 18 ? 'mudflat' : c.sandy ? 'sand' : c.woodland ? (c.canopyCover > .65 ? 'matureForest' : 'youngWoodland') : c.shrubland ? (c.ecoMoisture < .48 ? 'dryScrub' : 'bushland') : c.soilDepth < .28 && c.ecoMoisture < .38 ? 'heath' : c.grassHeight > .68 ? 'longGrass' : c.biomass < .18 ? 'bareDirt' : 'shortGrass';
    }
  }
  update(day, season, weather = null) { this._seasonalTemperature = season === 'Winter' ? -7 : season === 'Summer' ? 5 : season === 'Autumn' ? -2 : 1; this._hydrologyStep(1, false, weather); this._deriveEcology(); this._indexBuckets(); }
  _indexBuckets() { this.buckets.clear(); const step = Math.max(2, this.radius * 2.2); this.bucketStep = step; for (const c of this.cells) { const k = `${Math.floor((c.x + this.half) / step)},${Math.floor((c.z + this.half) / step)}`; if (!this.buckets.has(k)) this.buckets.set(k, []); this.buckets.get(k).push(c); } }
  lookup(x, z) { const bx = Math.floor((x + this.half) / this.bucketStep), bz = Math.floor((z + this.half) / this.bucketStep); let best = null, bestD = Infinity; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const c of this.buckets.get(`${bx + dx},${bz + dz}`) || []) { const d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < bestD) { bestD = d; best = c; } } return best || this.cells[0]; }
  corners(c) { const out = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); out.push({ x: c.x + this.radius * Math.cos(a), z: c.z + this.radius * Math.sin(a) }); } return out; }
  waterAt(x, z) { return this.lookup(x, z)?.waterDepth || 0; }
}
