const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n += n << 3; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
const noise = (x, z, seed) => hash(Math.imul(Math.floor(x * 37.1), 73856093) ^ Math.imul(Math.floor(z * 37.1), 19349663) ^ seed);
const smooth = (x, z, seed, scale) => { const gx = x / scale, gz = z / scale, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); const a = noise(ix, iz, seed), b = noise(ix + 1, iz, seed), c = noise(ix, iz + 1, seed), d = noise(ix + 1, iz + 1, seed); return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz; };
const fbm = (x, z, seed) => smooth(x, z, seed, 75) * .55 + smooth(x, z, seed + 19, 31) * .3 + smooth(x, z, seed + 41, 12) * .15;

const FEATURE_SHAPES = Object.freeze({
  mountain: { count: 3.2, length: [.12, .24], width: [.1, .2], amplitude: 32 },
  hill: { count: 2.8, length: [.08, .2], width: [.07, .18], amplitude: 11 },
  valley: { count: 2.2, length: [.13, .3], width: [.045, .12], amplitude: -15 },
  ridge: { count: 2.5, length: [.2, .43], width: [.06, .14], amplitude: 11 },
  plateau: { count: 1.8, length: [.1, .23], width: [.09, .2], amplitude: 14 }
});

const MOUNTAIN_PROFILES = Object.freeze([
  { id: "rounded-massif", setting: "roundedMountains" },
  { id: "pyramidal-peak", setting: "pyramidalMountains" },
  { id: "alpine-range", setting: "alpineRanges" }
]);

function mountainInfluence(feature, u, v) {
  const radius = Math.hypot(u, v), sharpness = feature.sharpness;
  if (feature.profile === "pyramidal-peak") return Math.max(0, 1 - radius / 1.28) ** (.72 + sharpness * .5);
  if (feature.profile === "alpine-range") {
    const connectedBase = Math.exp(-(u * u * .82 + v * v * 1.35) * (1 + sharpness * .18)) * .58;
    let summit = 0;
    for (const peak of feature.summits) {
      const pu = (u - peak.u) / peak.radiusU, pv = (v - peak.v) / peak.radiusV;
      summit = Math.max(summit, Math.exp(-(pu * pu + pv * pv) * (.95 + sharpness * .6)) * peak.height);
    }
    return clamp(connectedBase + summit * .62, 0, 1.14);
  }
  return Math.exp(-(radius ** 1.7) * (.95 + sharpness * .47));
}

export function createTerrainRegionField(seed, size, settings = {}) {
  const relief = clamp(Number(settings.relief) || 0, 0, 2), features = [];
  const controls = { mountain: settings.mountains ?? 1, hill: settings.hills ?? 1, valley: settings.valleys ?? 1, ridge: settings.ridges ?? 0, plateau: settings.plateaus ?? 0 };
  const mountainBreadth = clamp(Number(settings.mountainBreadth ?? 1.35) || 0, .5, 2.5), summitSharpness = clamp(Number(settings.summitSharpness ?? 1) || 0, .5, 2);
  const mountainRangeLength = clamp(Number(settings.mountainRangeLength ?? 1.4) || 0, .5, 2.5), mountainRangeComplexity = clamp(Number(settings.mountainRangeComplexity ?? 1) || 0, .5, 2);
  const mountainWeights = MOUNTAIN_PROFILES.map(profile => clamp(Number(settings[profile.setting] ?? (profile.id === "alpine-range" ? 1.25 : 1)) || 0, 0, 2));
  const mountainWeightTotal = mountainWeights.reduce((total, weight) => total + weight, 0);
  let serial = 0;
  for (const [kind, rawAmount] of Object.entries(controls)) {
    const amount = clamp(Number(rawAmount) || 0, 0, 2), shape = FEATURE_SHAPES[kind], count = amount > 0 && (kind !== "mountain" || mountainWeightTotal > 0) ? Math.max(1, Math.round(amount * shape.count)) : 0;
    for (let index = 0; index < count; index += 1) {
      const token = serial++ + Object.keys(FEATURE_SHAPES).indexOf(kind) * 97;
      const random = offset => hash((seed >>> 0) ^ Math.imul(token * 11 + offset + 1, 2654435761));
      const lerp = ([minimum, maximum], value) => minimum + (maximum - minimum) * value;
      let length = size * lerp(shape.length, random(4)), width = size * lerp(shape.width, random(5)), amplitude = shape.amplitude * amount, profile = null, summits = Object.freeze([]);
      if (kind === "mountain") {
        const enabledProfiles = MOUNTAIN_PROFILES.map((candidate, candidateIndex) => ({ candidate, candidateIndex })).filter(item => mountainWeights[item.candidateIndex] > 0);
        let profileIndex;
        if (index < enabledProfiles.length) profileIndex = enabledProfiles[(index + Math.floor(hash(seed) * enabledProfiles.length)) % enabledProfiles.length].candidateIndex;
        else {
          let choice = random(6) * mountainWeightTotal; profileIndex = 0;
          while (profileIndex < mountainWeights.length - 1 && choice >= mountainWeights[profileIndex]) choice -= mountainWeights[profileIndex++];
          while (profileIndex < mountainWeights.length - 1 && mountainWeights[profileIndex] === 0) profileIndex += 1;
        }
        profile = MOUNTAIN_PROFILES[profileIndex].id;
        length *= mountainBreadth; width *= mountainBreadth;
        if (profile === "rounded-massif") {
          const diameter = (length + width) * .5;
          length = diameter * (.94 + random(7) * .12); width = diameter * (.94 + random(8) * .12); amplitude *= .82;
        } else if (profile === "pyramidal-peak") {
          width = Math.max(width, length * (.76 + random(7) * .16)); amplitude *= .96;
        } else {
          length *= 1.34 * mountainRangeLength; width = Math.max(width, length * (.3 + random(7) * .1) / Math.sqrt(mountainRangeLength)); amplitude *= .88;
          const summitCount = clamp(Math.round((3 + Math.floor(random(8) * 3)) * mountainRangeComplexity), 2, 10);
          summits = Object.freeze(Array.from({ length: summitCount }, (_, summitIndex) => Object.freeze({
            u: -.72 + summitIndex / (summitCount - 1) * 1.44,
            v: (random(20 + summitIndex) - .5) * .42,
            radiusU: .28 + random(30 + summitIndex) * .14,
            radiusV: .36 + random(40 + summitIndex) * .2,
            height: .72 + random(50 + summitIndex) * .28
          })));
        }
      }
      features.push({
        kind,
        cx: (random(1) - .5) * size * .82,
        cz: (random(2) - .5) * size * .82,
        angle: random(3) * Math.PI,
        length,
        width,
        amplitude,
        ...(profile ? { profile, summits, sharpness: summitSharpness } : {})
      });
    }
  }
  const roughness = clamp(Number(settings.roughness) || 0, 0, 2);
  const sampleAt = (x, z) => {
    if (relief === 0) return Object.freeze({ elevation: 0, landform: "plain", dominantFeature: null, featureContribution: 0 });
    const broadElevation = ((x / size) * 3.3 + fbm(x, z, seed) * 7 - 3.5) * relief;
    const roughContribution = roughness > 0 ? ((smooth(x + 317, z - 211, seed + 1409, 7.5) - .5) * 4.8 + (smooth(x - 173, z + 409, seed + 1553, 3.2) - .5) * 1.8) * roughness * relief : 0;
    let elevation = broadElevation + roughContribution, dominantFeature = null, featureContribution = 0;
    for (const feature of features) {
      const dx = x - feature.cx, dz = z - feature.cz, cosine = Math.cos(feature.angle), sine = Math.sin(feature.angle);
      const u = (dx * cosine + dz * sine) / feature.length, v = (-dx * sine + dz * cosine) / feature.width, radius = u * u + v * v;
      const influence = feature.kind === "mountain" ? mountainInfluence(feature, u, v) : feature.kind === "ridge" ? Math.exp(-(u * u * 1.15 + v * v * 2.8) * 1.75) : feature.kind === "plateau" ? Math.exp(-Math.pow(radius, 2.15) * 3.2) : Math.exp(-radius * 2.2);
      const contribution = feature.amplitude * influence * relief;
      elevation += contribution;
      if (Math.abs(contribution) > Math.abs(featureContribution)) { dominantFeature = feature.kind; featureContribution = contribution; }
    }
    const featureVisible = Math.abs(featureContribution) >= Math.max(.08, relief * .35);
    const landform = featureVisible ? dominantFeature : Math.abs(roughContribution) > Math.max(.06, relief * .2) ? "broken-ground" : "rolling-ground";
    return Object.freeze({ elevation, landform, dominantFeature: featureVisible ? dominantFeature : null, featureContribution });
  };
  const elevationAt = (x, z) => sampleAt(x, z).elevation;
  return Object.freeze({ seed: seed >>> 0, size, relief, roughness, mountainBreadth, summitSharpness, mountainRangeLength, mountainRangeComplexity, features: Object.freeze(features.map(Object.freeze)), sampleAt, elevationAt });
}
