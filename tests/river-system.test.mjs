import test from 'node:test';
import assert from 'node:assert/strict';
import { HexWorld } from '../src/hex-world.js';
import {
  adjacentLakeMouthCell,
  classifyRiverNetwork,
  riverChannelPattern,
  riverFlowRegime,
  strahlerOrders
} from '../src/river-system.js';

const cell = (id, overrides = {}) => ({
  id, x: id, z: 0, channel: true, neighbours: [], flowTo: null,
  meanDischarge: 1, peakDischarge: 1.3, groundwater: 25, humidity: .4,
  baseTemperature: 14, slope: .04, parentMaterial: 'loam', vegetationStability: .6,
  ...overrides
});

const connect = (upstream, downstream) => {
  upstream.flowTo = downstream;
  upstream.neighbours.push(downstream);
  downstream.neighbours.push(upstream);
};

test('Strahler order rises only where equal-order tributaries meet', () => {
  const [a, b, c, d, e, f, g, h, i] = Array.from({ length: 9 }, (_, index) => cell(index + 1));
  connect(a, c); connect(b, c); connect(c, e); connect(d, e);
  connect(f, h); connect(g, h); connect(e, i); connect(h, i);
  const orders = strahlerOrders([a, b, c, d, e, f, g, h, i]);
  assert.equal(orders.get(a.id), 1);
  assert.equal(orders.get(c.id), 2);
  assert.equal(orders.get(e.id), 2);
  assert.equal(orders.get(h.id), 2);
  assert.equal(orders.get(i.id), 3);
});

test('river width and size increase with network flow and can be made uniform', () => {
  const head = cell(1, { meanDischarge: 1 }), middle = cell(2, { meanDischarge: 10 }), mouth = cell(3, { meanDischarge: 100 });
  connect(head, middle); connect(middle, mouth);
  const natural = classifyRiverNetwork([head, middle, mouth], { hexDiameter: 2, widthVariation: 1, patternDiversity: 1, settings: { rainfall: 1, sedimentTransport: 1 }, seed: 7 });
  const widths = [head, middle, mouth].map(item => natural.classifications.get(item.id).channelWidth);
  assert.ok(widths[0] < widths[1] && widths[1] < widths[2]);
  assert.notEqual(natural.classifications.get(head.id).sizeClass, natural.classifications.get(mouth.id).sizeClass);
  const uniform = classifyRiverNetwork([head, middle, mouth], { hexDiameter: 2, widthVariation: 0, patternDiversity: 0, settings: { rainfall: 1 } });
  assert.deepEqual([head, middle, mouth].map(item => uniform.classifications.get(item.id).channelWidth), [.17, .17, .17]);
  assert.ok([...uniform.classifications.values()].every(item => item.pattern === 'single-channel'));
});

test('flow regimes distinguish groundwater support, seasonal water and storm-only channels', () => {
  assert.equal(riverFlowRegime(cell(1, { groundwater: 70, humidity: .7 }), { rainfall: 1.4 }), 'perennial');
  assert.equal(riverFlowRegime(cell(2, { groundwater: 15, humidity: .2 }), { rainfall: 1 }), 'intermittent');
  assert.equal(riverFlowRegime(cell(3, { groundwater: 4, humidity: .1, baseTemperature: 34 }), { rainfall: .2 }), 'ephemeral');
  assert.equal(riverFlowRegime(cell(4, { groundwater: 7, humidity: .1, baseTemperature: -4, snowPack: 8 }), { rainfall: .3 }), 'intermittent');
});

test('terrain and sediment select the supported simplified channel patterns', () => {
  assert.equal(riverChannelPattern(cell(1, { slope: .22, parentMaterial: 'bedrock' }), { patternDiversity: 1, streamOrder: 1, sizeScore: .2 }), 'cascade');
  assert.equal(riverChannelPattern(cell(2, { slope: .012, groundwater: 60, parentMaterial: 'loam' }), { patternDiversity: 1, streamOrder: 3, sizeScore: .8 }), 'anastomosing');
  assert.equal(riverChannelPattern(cell(3, { slope: .06, parentMaterial: 'gravel' }), { patternDiversity: 1, sedimentTransport: 1.5, streamOrder: 2, sizeScore: .6 }), 'braided');
  assert.equal(riverChannelPattern(cell(4, { slope: .03, groundwater: 8, parentMaterial: 'loam' }), { patternDiversity: 1, streamOrder: 1, sizeScore: .5 }), 'meandering');
  assert.equal(riverChannelPattern(cell(5, { slope: .11, parentMaterial: 'loam' }), { patternDiversity: 1, streamOrder: 1, sizeScore: .2 }), 'straight');
});

test('lake mouths use only an adjacent basin hex and never the distant spill reference', () => {
  const last = cell(1, { x: 0, z: 0 }), adjacent = cell(2, { x: 1, z: 0, channel: false }), distant = cell(3, { x: 30, z: 30, channel: false });
  last.neighbours = [adjacent];
  const basin = { cells: [distant, adjacent], spillInside: distant, level: 2 };
  assert.equal(adjacentLakeMouthCell(last, basin), adjacent);
  last.neighbours = [];
  assert.equal(adjacentLakeMouthCell(last, basin), null);
});

const worldSettings = (overrides = {}) => ({
  size: 90, hexDetail: 5000, startSeason: 'Spring', windDirection: 'west', windStrength: 1,
  stormIntensity: 1, rainShadow: 1, sedimentTransport: 1, relief: .15, mountains: 1,
  hills: 1, valleys: 1, ridges: .55, plateaus: .35, roughness: .3, rivers: 1.25,
  riverWidthVariation: 1, riverPatternDiversity: 1, lakes: 1.25, woodland: 1,
  trees: 1, bushes: 1, longGrass: 1, rainfall: 1.2, northTemperature: 8,
  southTemperature: 24, coldestTemperature: -12, hottestTemperature: 36,
  temperatureVariation: 1, climate: 1, ...overrides
});

test('generated river routes reach lakes only through adjacent basin cells', () => {
  const world = new HexWorld(1337, worldSettings());
  for (const route of world.riverRoutes) {
    const last = route.cells.at(-1), basin = last?.flowTo;
    if (!Array.isArray(basin?.cells)) continue;
    const mouth = adjacentLakeMouthCell(last, basin);
    assert.ok(mouth, `route ${route.id} must have an adjacent lake-mouth cell`);
    assert.ok(last.neighbours.includes(mouth));
  }
  const dry = new HexWorld(1337, worldSettings({ rivers: 0 }));
  assert.equal(dry.riverRoutes.length, 0);
  assert.equal(dry.cells.filter(item => item.channel).length, 0);
});
