const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n += n << 3; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
const noise = (x, z, seed) => hash(Math.imul(Math.floor(x * 37.1), 73856093) ^ Math.imul(Math.floor(z * 37.1), 19349663) ^ seed);
const smooth = (x, z, seed, scale) => { const gx = x / scale, gz = z / scale, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); const a = noise(ix, iz, seed), b = noise(ix + 1, iz, seed), c = noise(ix, iz + 1, seed), d = noise(ix + 1, iz + 1, seed); return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz; };
const fbm = (x, z, seed) => smooth(x, z, seed, 75) * .55 + smooth(x, z, seed + 19, 31) * .3 + smooth(x, z, seed + 41, 12) * .15;

const FEATURE_SHAPES = Object.freeze({
  mountain: { count: 2.2, length: [.07, .17], width: [.055, .13], amplitude: 34 },
  hill: { count: 2.8, length: [.08, .2], width: [.07, .18], amplitude: 11 },
  valley: { count: 2.2, length: [.13, .3], width: [.045, .12], amplitude: -15 },
  ridge: { count: 2.5, length: [.2, .43], width: [.022, .065], amplitude: 18 },
  plateau: { count: 1.8, length: [.1, .23], width: [.09, .2], amplitude: 14 }
});

export function createTerrainRegionField(seed, size, settings = {}) {
  const relief = clamp(Number(settings.relief) || 0, 0, 2), features = [];
  const controls = { mountain: settings.mountains ?? 1, hill: settings.hills ?? 1, valley: settings.valleys ?? 1, ridge: settings.ridges ?? 0, plateau: settings.plateaus ?? 0 };
  let serial = 0;
  for (const [kind, rawAmount] of Object.entries(controls)) {
    const amount = clamp(Number(rawAmount) || 0, 0, 2), shape = FEATURE_SHAPES[kind], count = amount > 0 ? Math.max(1, Math.round(amount * shape.count)) : 0;
    for (let index = 0; index < count; index += 1) {
      const token = serial++ + Object.keys(FEATURE_SHAPES).indexOf(kind) * 97;
      const random = offset => hash((seed >>> 0) ^ Math.imul(token * 11 + offset + 1, 2654435761));
      const lerp = ([minimum, maximum], value) => minimum + (maximum - minimum) * value;
      features.push({
        kind,
        cx: (random(1) - .5) * size * .82,
        cz: (random(2) - .5) * size * .82,
        angle: random(3) * Math.PI,
        length: size * lerp(shape.length, random(4)),
        width: size * lerp(shape.width, random(5)),
        amplitude: shape.amplitude * amount
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
      const influence = feature.kind === "ridge" ? Math.exp(-(u * u * 1.25 + v * v * 8.5) * 2.1) : feature.kind === "plateau" ? Math.exp(-Math.pow(radius, 2.15) * 3.2) : Math.exp(-radius * 2.2);
      const contribution = feature.amplitude * influence * relief;
      elevation += contribution;
      if (Math.abs(contribution) > Math.abs(featureContribution)) { dominantFeature = feature.kind; featureContribution = contribution; }
    }
    const featureVisible = Math.abs(featureContribution) >= Math.max(.08, relief * .35);
    const landform = featureVisible ? dominantFeature : Math.abs(roughContribution) > Math.max(.06, relief * .2) ? "broken-ground" : "rolling-ground";
    return Object.freeze({ elevation, landform, dominantFeature: featureVisible ? dominantFeature : null, featureContribution });
  };
  const elevationAt = (x, z) => sampleAt(x, z).elevation;
  return Object.freeze({ seed: seed >>> 0, size, relief, roughness, features: Object.freeze(features.map(Object.freeze)), sampleAt, elevationAt });
}
