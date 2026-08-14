import { acousticScoreForEvent, interpolateScoreCurve } from "./acoustic-score.js";
import { audioBusLevels, DEFAULT_AUDIO_PLAYBACK_ENABLED, DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings, SOUND_LANGUAGE_IDS } from "./audio-settings.js";
import { activePrecipitationIntensity } from "./localized-weather.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const TAU = Math.PI * 2;
const hash = value => { let result = 2166136261; for (const character of String(value)) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619); } return result >>> 0; };
const randomSequence = seed => { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; }; };

const DEFAULT_SHAPES = Object.freeze({
  "mammal-laryngeal": Object.freeze({ attack: .1, release: .18, syllables: 1, syllableGap: .08, pitchStart: .96, pitchEnd: 1.03, vibratoRate: 5, vibratoDepth: .012, harmonicRolloff: 1.15, formantsHz: [500, 1050, 2100], formantBandwidthHz: [180, 260, 420], breathiness: .08, jitter: .012 }),
  "avian-syrinx": Object.freeze({ attack: .018, release: .05, syllables: 3, syllableGap: .045, pitchStart: .78, pitchEnd: 1.28, vibratoRate: 13, vibratoDepth: .035, trillRate: 18, harmonicRolloff: 1.65, breathiness: .035, jitter: .006 }),
  "reptile-turbulence": Object.freeze({ attack: .09, release: .2, syllables: 1, syllableGap: .05, pitchStart: 1, pitchEnd: .9, pulseRate: 9, breathiness: .92, jitter: .08 }),
  "modal-contact": Object.freeze({ attack: .002, release: .2, syllables: 1, syllableGap: 0, pitchStart: 1, pitchEnd: .62, breathiness: .45, jitter: .03 }),
  "weather-noise": Object.freeze({ attack: .01, release: .55, syllables: 1, syllableGap: 0, pitchStart: 1, pitchEnd: .7, breathiness: .85, jitter: .04 }),
  "water-noise": Object.freeze({ attack: .08, release: .35, syllables: 1, syllableGap: 0, pitchStart: .9, pitchEnd: 1.08, breathiness: .72, jitter: .03 }),
  "mechanical-impact": Object.freeze({ attack: .002, release: .16, syllables: 1, syllableGap: 0, pitchStart: 1, pitchEnd: .65, breathiness: .5, jitter: .04 })
});

export function proceduralCallPlan(event, translated = false, soundLanguage = "natural-reconstruction") {
  const kind = event?.synthesis?.kind || "modal-contact", defaults = DEFAULT_SHAPES[kind] || DEFAULT_SHAPES["modal-contact"], supplied = event?.synthesis?.shape || {}, score = event?.acousticScore || acousticScoreForEvent(event);
  const frequency = translated ? clamp(Number(score?.fundamentalHz || event?.centreFrequencyHz || 440), 80, 8000) : clamp(Number(score?.fundamentalHz || event?.centreFrequencyHz || 440), 12, 20000);
  const duration = clamp(Number(score?.durationSeconds || event?.durationSeconds || .2), .05, 14);
  return Object.freeze({
    kind, mechanism: score?.productionMechanism || event?.synthesis?.mechanism || null, soundLanguage, score,
    frequency, duration,
    attack: clamp(Number(supplied.attack ?? defaults.attack), .001, duration * .45),
    release: clamp(Number(supplied.release ?? defaults.release), .005, duration * .6),
    syllables: Math.round(clamp(Number(score?.rhythm?.pulses ?? supplied.syllables ?? defaults.syllables), 1, 32)),
    syllableGap: clamp(Number(supplied.syllableGap ?? defaults.syllableGap), 0, .5),
    pitchStart: clamp(Number(supplied.pitchStart ?? defaults.pitchStart), .25, 4), pitchEnd: clamp(Number(supplied.pitchEnd ?? defaults.pitchEnd), .25, 4),
    vibratoRate: clamp(Number(supplied.vibratoRate ?? defaults.vibratoRate ?? 0), 0, 45), vibratoDepth: clamp(Number(supplied.vibratoDepth ?? defaults.vibratoDepth ?? 0), 0, .3),
    trillRate: clamp(Number(supplied.trillRate ?? defaults.trillRate ?? 0), 0, 60), pulseRate: clamp(Number(score?.rhythm?.pulseRateHz ?? supplied.pulseRate ?? defaults.pulseRate ?? 0), 0, 80),
    harmonicRolloff: clamp(Number(score?.harmonics?.rolloff ?? supplied.harmonicRolloff ?? defaults.harmonicRolloff ?? 1.3), .55, 3),
    formantsHz: Object.freeze((score?.formants?.map(formant => formant.frequencyHz) || supplied.formantsHz || defaults.formantsHz || []).map(Number).filter(Number.isFinite).slice(0, 8)),
    formantBandwidthHz: Object.freeze((score?.formants?.map(formant => formant.bandwidthHz) || supplied.formantBandwidthHz || defaults.formantBandwidthHz || []).map(Number).filter(Number.isFinite).slice(0, 8)),
    breathiness: clamp(Number(score?.turbulence ?? supplied.breathiness ?? defaults.breathiness ?? 0), 0, 1), jitter: clamp(Number(score?.jitter ?? supplied.jitter ?? defaults.jitter ?? 0), 0, .25),
    roughness: clamp(Number(score?.roughness ?? event?.synthesis?.roughness ?? 0), 0, 1), timbre: clamp(Number(event?.synthesis?.timbre || 0), 0, 1),
    voiceSeed: Number(event?.synthesis?.voiceSeed || hash(event?.eventId || "voice")) >>> 0,
    contact: event?.synthesis?.contact || null
  });
}

function envelopeAt(time, duration, attack, release) {
  const rise = clamp(time / Math.max(.001, attack), 0, 1), fall = clamp((duration - time) / Math.max(.001, release), 0, 1);
  return Math.sin(Math.PI * .5 * rise) * Math.sin(Math.PI * .5 * fall);
}

function normalizeSamples(samples, peakTarget = .86) {
  let peak = .0001, mean = 0;
  for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); mean += sample; }
  mean /= samples.length;
  const scale = peakTarget / Math.max(.0001, peak + Math.abs(mean));
  for (let index = 0; index < samples.length; index += 1) samples[index] = clamp((samples[index] - mean) * scale, -.92, .92);
  return samples;
}

function formantResonance(plan, harmonicHz) {
  if (!plan.formantsHz.length) return 1;
  let resonance = .08;
  for (let index = 0; index < plan.formantsHz.length; index += 1) resonance += 1 / (1 + ((harmonicHz - plan.formantsHz[index]) / Math.max(28, plan.formantBandwidthHz[index] || plan.formantsHz[index] * .16)) ** 2);
  return resonance;
}

function contourAt(plan, progress) {
  if (plan.score?.frequencyContour?.length) {
    const measured = interpolateScoreCurve(plan.score.frequencyContour, progress, "ratio");
    if (plan.soundLanguage !== "bioacoustic-signature") return measured;
    const ratios = plan.score.frequencyContour.map(point => point.ratio), low = Math.min(...ratios), high = Math.max(...ratios);
    return clamp(1 + (measured - 1) * 1.16, low, high);
  }
  return plan.pitchStart * (1 - progress) + plan.pitchEnd * progress;
}

function scoreEnvelope(plan, progress, time) {
  const canonical = plan.score?.amplitudeEnvelope?.length ? interpolateScoreCurve(plan.score.amplitudeEnvelope, progress, "amplitude") : 1;
  const pulse = plan.syllables > 1 && !plan.score?.amplitudeEnvelope?.length ? Math.max(0, Math.sin(Math.PI * plan.syllables * progress)) ** .45 : 1;
  return canonical * pulse * envelopeAt(time, plan.duration, plan.attack, plan.release);
}

function physicalVoice(plan, phase, frequency, time, noise, jitter, style) {
  if (plan.mechanism === "turbulent-hiss" || plan.kind === "reptile-turbulence") {
    const pulse = plan.pulseRate ? .3 + .7 * Math.max(0, Math.sin(TAU * plan.pulseRate * time)) : 1;
    return (noise * .88 + Math.sin(phase) * (1 - plan.breathiness) * .3) * pulse;
  }
  const dual = plan.mechanism === "dual-syrinx" || plan.kind === "avian-syrinx";
  const maxHarmonics = style === "analogue-ecology" ? 12 : style === "digital-ecology" ? 9 : 18;
  const count = Math.min(maxHarmonics, Math.max(3, Math.floor(18000 / Math.max(20, frequency))));
  let sample = 0;
  for (let harmonic = 1; harmonic <= count; harmonic += 1) {
    const resonance = formantResonance(plan, frequency * harmonic), rolloff = 1 / Math.pow(harmonic, plan.harmonicRolloff);
    if (style === "analogue-ecology") sample += (Math.sin(phase * harmonic) + .16 * Math.sin(phase * harmonic * .997 + .7)) * resonance * rolloff;
    else if (style === "digital-ecology") { const table = Math.sin(phase * harmonic + Math.sin(phase * .5) * (.12 + plan.timbre * .2)); sample += Math.round(table * 24) / 24 * resonance * rolloff; }
    else sample += Math.sin(phase * harmonic + harmonic * plan.timbre) * resonance * rolloff;
  }
  if (dual) sample += Math.sin(phase * (1.43 + plan.timbre * .21) + Math.sin(phase * .37) * .28) * .56;
  const roughSubharmonic = Math.sin(phase * .5 + jitter * 2) * plan.roughness * .35;
  return sample + roughSubharmonic + noise * (plan.breathiness * .42 + plan.roughness * .08);
}

function instrumentalVoice(plan, phase, frequency, time, noise) {
  const instrument = plan.score?.sonificationInstrument || "reed";
  const attackFamily = /piano|marimba|woodblock|pluck|drum|guiro/.test(instrument);
  const decay = attackFamily ? Math.exp(-time * (2.2 + plan.frequency / 900)) : 1;
  if (/drum|percussion|guiro|shaker/.test(instrument)) return (noise * .38 + Math.sin(phase) + Math.sin(phase * 1.49) * .48) * decay;
  if (/flute|whistle|ocarina|piccolo/.test(instrument)) return (Math.sin(phase) + Math.sin(phase * 2) * .12 + noise * .025) * decay;
  if (/string|piano|marimba|pluck/.test(instrument)) return (Math.sin(phase) + Math.sin(phase * 2.01) * .42 + Math.sin(phase * 3.99) * .16) * decay;
  return (Math.sin(phase) + Math.sin(phase * 2) * .34 + Math.sin(phase * 3) * .18 + noise * .035) * decay;
}

function modalContact(plan, sampleRate, language) {
  const contact = plan.contact || {}, mass = clamp(Number(contact.bodyMassKg || 20), .05, 7000), force = clamp(Number(contact.contactForce || mass * .12), .1, 9000), anatomy = contact.anatomy || "foot", substrate = contact.substrate || "soil";
  const length = Math.max(256, Math.ceil(plan.duration * sampleRate)), data = new Float32Array(length), random = randomSequence(plan.voiceSeed);
  const anatomyBase = ({ hoof: 390, "cloven-hoof": 330, paw: 145, "clawed-foot": 210, "bird-foot": 610, "reptile-foot": 120, "body-drag": 75, "padded-columnar-foot": 58 })[anatomy] || 180;
  const substrateScale = ({ rock: 1.8, sand: .48, mud: .34, snow: .42, grass: .68, "leaf-litter": 1.22, water: .55, soil: .76 })[substrate] || .8;
  const base = clamp(anatomyBase * substrateScale / Math.pow(Math.max(.2, mass / 40), .12), 34, 2800), modes = [1, 1.57, 2.31, 3.86];
  let scrape = 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate, white = random() * 2 - 1, impact = Math.exp(-time * (substrate === "rock" ? 30 : substrate === "mud" || substrate === "snow" ? 10 : 18)); scrape = scrape * .82 + white * .18;
    let sample = 0;
    for (let mode = 0; mode < modes.length; mode += 1) sample += Math.sin(TAU * base * modes[mode] * time + mode * .7) * Math.exp(-time * (10 + mode * 6)) / (mode + 1);
    const displaced = ["grass", "leaf-litter", "sand", "snow"].includes(substrate) ? scrape * Math.exp(-time * 5.5) * .65 : substrate === "mud" ? Math.sin(TAU * 43 * time) * Math.exp(-time * 6) * .42 : white * Math.exp(-time * 24) * .12;
    const water = substrate === "water" ? Math.sin(TAU * (180 + 90 * Math.exp(-time * 5)) * time) * Math.exp(-time * 4) * .5 : 0;
    data[index] = (sample * .45 + displaced + water) * impact * clamp(.34 + Math.log1p(force) / 8, .3, 1.2);
  }
  if (language === "bioacoustic-signature") for (let i = 0; i < length; i += 1) data[i] = Math.tanh(data[i] * 1.28) + Math.sin(TAU * base * i / sampleRate) * Math.abs(data[i]) * .08;
  if (language === "analogue-ecology") for (let i = 0; i < length; i += 1) data[i] = Math.tanh(data[i] * 1.45) + Math.sin(TAU * base * .5 * i / sampleRate) * Math.exp(-i / sampleRate * 11) * .12;
  if (language === "digital-ecology") { let held = 0; for (let i = 0; i < length; i += 1) { if (i % 3 === 0) held = data[i]; data[i] = Math.round(held * 26) / 26; } }
  if (language === "instrumental-sonification") for (let i = 0; i < length; i += 1) data[i] = (Math.sin(TAU * base * i / sampleRate) + Math.sin(TAU * base * 1.5 * i / sampleRate) * .42 + Math.sign(data[i]) * .08) * Math.exp(-i / sampleRate * (substrate === "rock" ? 13 : 8));
  return normalizeSamples(data, .78);
}

function discreteEnvironment(event, sampleRate, language) {
  const duration = clamp(Number(event.durationSeconds || 1), .08, 10), length = Math.ceil(duration * sampleRate), data = new Float32Array(length), random = randomSequence(event.synthesis?.voiceSeed || hash(event.eventId));
  const kind = event.synthesis?.mechanism || "wind"; let low = 0, mid = 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate, white = random() * 2 - 1; low = low * .996 + white * .004; mid = mid * .84 + white * .16;
    if (kind === "thunder") { const crack = Math.exp(-time * 9) * (white * .55 + Math.sin(TAU * 82 * time) * .75), rumble = low * 4 * Math.exp(-time * .62) * (1 + .25 * Math.sin(time * 6.1)); data[index] = crack + rumble; }
    else if (kind === "rain") { const impact = random() > .97 ? Math.exp(-(time % .025) * 90) * (random() * 2 - 1) : 0; data[index] = impact + (mid - low) * .12; }
    else if (kind === "vegetation") data[index] = (mid - low) * Math.max(0, Math.sin(time * 4.7)) * .5 + Math.sin(TAU * 310 * time) * Math.exp(-time * 8) * .13;
    else if (kind === "river" || kind === "waterfall") data[index] = mid * .32 + low * 1.1 + Math.sin(TAU * (90 + 30 * Math.sin(time * 3)) * time) * Math.max(0, Math.sin(time * 8.7)) * .08;
    else data[index] = low * 2.4 * (.55 + .35 * Math.sin(time * .43)) + (mid - low) * .08;
  }
  if (language === "bioacoustic-signature") for (let i = 0; i < data.length; i += 1) data[i] = Math.tanh(data[i] * 1.2) + Math.sin(TAU * (kind === "thunder" ? 68 : kind === "rain" ? 2300 : kind === "river" || kind === "waterfall" ? 240 : 95) * i / sampleRate) * Math.abs(data[i]) * .06;
  if (language === "analogue-ecology") for (let i = 0; i < data.length; i += 1) data[i] = Math.tanh(data[i] * 1.42) + Math.sin(TAU * (kind === "thunder" ? 54 : kind === "rain" ? 1700 : kind === "river" || kind === "waterfall" ? 180 : 72) * i / sampleRate) * Math.abs(data[i]) * .1;
  if (language === "instrumental-sonification") for (let i = 0; i < data.length; i += 1) data[i] = Math.sin(data[i] * 2.2 + i / sampleRate * TAU * (kind === "rain" ? 880 : kind === "water" ? 330 : 110)) * .55;
  if (language === "digital-ecology") for (let i = 0; i < data.length; i += 1) data[i] = Math.round(data[i] * 32) / 32;
  return normalizeSamples(data, kind === "thunder" ? .9 : .72);
}

export function synthesiseSoundEvent(event, sampleRate = 48000, soundLanguage = "natural-reconstruction", translated = false) {
  const language = SOUND_LANGUAGE_IDS.includes(soundLanguage) ? soundLanguage : "natural-reconstruction", plan = proceduralCallPlan(event, translated, language);
  if (plan.kind === "modal-contact" || plan.kind === "mechanical-impact") return modalContact(plan, sampleRate, language);
  if (["weather-noise", "water-noise"].includes(plan.kind)) return discreteEnvironment(event, sampleRate, language);
  const length = Math.max(128, Math.ceil(plan.duration * sampleRate)), data = new Float32Array(length), random = randomSequence(plan.voiceSeed);
  let phase = random() * TAU, noiseState = 0, jitterState = 0, heldDigital = 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate, progress = index / Math.max(1, length - 1), white = random() * 2 - 1; noiseState = noiseState * .77 + white * .23; jitterState = jitterState * .996 + white * .004;
    const contour = contourAt(plan, progress), vibrato = 1 + Math.sin(TAU * plan.vibratoRate * time + plan.timbre * 3) * plan.vibratoDepth, frequency = clamp(plan.frequency * contour * vibrato * (1 + jitterState * plan.jitter), 12, sampleRate * .43);
    phase += TAU * frequency / sampleRate;
    let sample = language === "instrumental-sonification" ? instrumentalVoice(plan, phase, frequency, time, noiseState) : physicalVoice(plan, phase, frequency, time, noiseState, jitterState, language);
    if (language === "digital-ecology") { if (index % 3 === 0) heldDigital = sample; sample = Math.round(heldDigital * 28) / 28; }
    if (language === "bioacoustic-signature") sample = Math.tanh(sample * 1.15) + Math.sin(phase * .5) * plan.roughness * .05;
    data[index] = sample * scoreEnvelope(plan, progress, time);
  }
  return normalizeSamples(data);
}

export function synthesiseProceduralCall(event, sampleRate = 48000, translated = false, soundLanguage = "natural-reconstruction") {
  return synthesiseSoundEvent(event, sampleRate, soundLanguage, translated);
}

function ambientChannel(kind, sampleRate, seconds, seed, language, channel) {
  const length = Math.ceil(sampleRate * seconds), data = new Float32Array(length), random = randomSequence(seed + channel * 7919); let slow = 0, mid = 0, fast = 0, eventEnergy = 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate, white = random() * 2 - 1; slow = slow * .9985 + white * .0015; mid = mid * .9 + white * .1; fast = fast * .42 + white * .58;
    if (kind === "wind") { const gust = .35 + .65 * Math.max(0, Math.sin(time * .31 + channel) * .64 + Math.sin(time * .071 + 2.3) * .36); data[index] = slow * 3.2 * gust + (mid - slow) * .05; }
    else if (kind === "vegetation") { if (random() > .9992) eventEnergy = .5 + random() * .5; eventEnergy *= .9993; const leaf = (fast - mid) * eventEnergy; const branch = Math.sin(TAU * (120 + channel * 30) * time) * eventEnergy * .12; data[index] = leaf * .55 + branch; }
    else if (kind.startsWith("rain")) { if (random() > .992) eventEnergy = .25 + random() * .75; eventEnergy *= kind === "rain-foliage" ? .991 : kind === "rain-water" ? .988 : .982; const base = kind === "rain-foliage" ? 2100 : kind === "rain-water" ? 780 : 1350, surface = Math.sin(TAU * (base + random() * (kind === "rain-foliage" ? 3100 : 1400)) * time) * eventEnergy; const body = kind === "rain-water" ? mid * .11 : kind === "rain-soil" ? slow * .18 : (fast - mid) * .08; data[index] = surface * (kind === "rain-soil" ? .3 : .5) + body; }
    else { if (random() > .998) eventEnergy = .3 + random() * .7; eventEnergy *= .996; const bubble = Math.sin(TAU * (70 + 100 * eventEnergy) * time) * eventEnergy * .16; data[index] = mid * .28 + slow * 1.2 + bubble; }
  }
  if (language === "analogue-ecology") for (let i = 0; i < length; i += 1) data[i] = Math.tanh(data[i] * 1.35) + Math.sin(TAU * (kind === "rain" ? 2400 : kind === "water" ? 95 : 43) * i / sampleRate) * Math.abs(data[i]) * .06;
  if (language === "digital-ecology") for (let i = 0; i < length; i += 1) data[i] = Math.round(data[i] * 40) / 40;
  if (language === "instrumental-sonification") for (let i = 0; i < length; i += 1) data[i] = Math.sin(data[i] * 1.7 + TAU * (kind.startsWith("rain") ? 1320 : kind === "water" ? 220 : kind === "vegetation" ? 660 : 73) * i / sampleRate) * Math.min(.65, Math.abs(data[i]) * .9);
  const blend = Math.min(Math.floor(sampleRate * .7), Math.floor(length / 5));
  for (let index = 0; index < blend; index += 1) { const ratio = index / blend, mixed = data[index] * ratio + data[length - blend + index] * (1 - ratio); data[index] = mixed; data[length - blend + index] = mixed; }
  return normalizeSamples(data, .68);
}

export class ProceduralAudioRenderer {
  constructor({ maximumVoices = 32, settings = null } = {}) {
    this.settings = normalizeAudioSettings({ ...(settings || DEFAULT_AUDIO_SETTINGS), maximumVoices }); this.maximumVoices = this.settings.maximumVoices;
    this.context = null; this.master = null; this.compressor = null; this.reverb = null; this.reverbGain = null;
    this.buses = new Map(); this.active = new Set(); this.played = new Map(); this.ambience = new Map(); this.bufferCache = new Map(); this.enabled = DEFAULT_AUDIO_PLAYBACK_ENABLED; this.waterAnchor = null; this.waterAnchorChangedAt = -Infinity;
  }

  async enable() {
    if (!this.settings.soundLanguage) throw new Error("Choose a sound language before enabling diegetic audio");
    if (!this.context) this.#createGraph(); await this.context.resume(); this.enabled = true; this.master.gain.setTargetAtTime(this.settings.masterVolume, this.context.currentTime, .04); this.#ensureAmbience(); return this.context.state;
  }
  disable() { this.enabled = false; if (this.master && this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, .04); for (const layers of this.ambience.values()) for (const layer of layers) layer.gain.gain.setTargetAtTime(0, this.context?.currentTime || 0, .08); }

  setSettings(settings) {
    const previousLanguage = this.settings.soundLanguage; this.settings = normalizeAudioSettings({ ...this.settings, ...settings }); this.maximumVoices = this.settings.maximumVoices;
    if (previousLanguage !== this.settings.soundLanguage) { this.#disposeAmbience(); this.bufferCache.clear(); if (this.enabled && this.settings.soundLanguage) this.#ensureAmbience(); }
    if (!this.context) return this.settings;
    const time = this.context.currentTime; this.master.gain.setTargetAtTime(this.enabled ? this.settings.masterVolume : 0, time, .04);
    for (const [name, level] of Object.entries(audioBusLevels(this.settings))) this.buses.get(name)?.gain.setTargetAtTime(level, time, .04);
    if (this.reverbGain) this.reverbGain.gain.setTargetAtTime(this.settings.reverberation * .22, time, .08); this.#configureCompressor(); return this.settings;
  }
  setVolume(value) { return this.setSettings({ masterVolume: value }); }
  setDynamicRange(mode) { return this.setSettings({ dynamicRange: mode }); }
  setBusVolume(bus, value) { const key = ({ animals: "animalVolume", movement: "movementVolume", wind: "windVolume", vegetation: "vegetationVolume", rain: "rainVolume", thunder: "thunderVolume", river: "riverVolume", shoreline: "shorelineVolume", interface: "interfaceVolume", cinema: "cinemaVolume" })[bus]; return key ? this.setSettings({ [key]: value }) : this.settings; }

  #createGraph() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AudioContextClass) throw new Error("Web Audio is not available in this browser");
    this.context = new AudioContextClass({ latencyHint: "interactive" }); this.compressor = this.context.createDynamicsCompressor(); this.master = this.context.createGain(); this.master.gain.value = 0; this.master.connect(this.compressor).connect(this.context.destination);
    const levels = audioBusLevels(this.settings);
    for (const name of Object.keys(levels)) { const gain = this.context.createGain(); gain.gain.value = levels[name]; gain.connect(this.master); this.buses.set(name, gain); }
    this.reverb = this.context.createConvolver(); this.reverbGain = this.context.createGain(); this.reverbGain.gain.value = this.settings.reverberation * .22; const impulse = this.context.createBuffer(2, Math.ceil(this.context.sampleRate * 1.25), this.context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) { const data = impulse.getChannelData(channel), random = randomSequence(hash(`outdoor-reverb:${channel}`)); for (let i = 0; i < data.length; i += 1) data[i] = (random() * 2 - 1) * Math.exp(-i / this.context.sampleRate * 3.8) * .28; }
    this.reverb.buffer = impulse; this.reverb.connect(this.reverbGain).connect(this.master); this.#configureCompressor();
  }
  #configureCompressor() { if (!this.compressor) return; const values = this.settings.dynamicRange === "night" ? [-34, 26, 8, .004, .32] : this.settings.dynamicRange === "reduced" ? [-25, 22, 5, .006, .25] : [-14, 12, 2.2, .01, .18]; [this.compressor.threshold.value, this.compressor.knee.value, this.compressor.ratio.value, this.compressor.attack.value, this.compressor.release.value] = values; }

  setListener({ x = 0, y = 0, z = 0, forwardX = 0, forwardZ = -1 } = {}) {
    if (!this.context) return; const listener = this.context.listener, time = this.context.currentTime;
    if (listener.positionX) { listener.positionX.setTargetAtTime(x, time, .04); listener.positionY.setTargetAtTime(y, time, .04); listener.positionZ.setTargetAtTime(z, time, .04); listener.forwardX.setTargetAtTime(forwardX, time, .04); listener.forwardY.setTargetAtTime(0, time, .04); listener.forwardZ.setTargetAtTime(forwardZ, time, .04); listener.upX.setTargetAtTime(0, time, .04); listener.upY.setTargetAtTime(1, time, .04); listener.upZ.setTargetAtTime(0, time, .04); } else listener.setPosition(x, y, z);
  }

  #busFor(event) { const mechanism = event.synthesis?.mechanism; if (event.soundClass === "movement") return "movement"; if (event.soundClass === "water") return mechanism === "river" || mechanism === "waterfall" ? "river" : "shoreline"; if (event.soundClass === "weather") return mechanism === "thunder" ? "thunder" : mechanism === "rain" ? "rain" : mechanism === "vegetation" ? "vegetation" : "wind"; return "animals"; }
  #samples(event, translated, language) {
    const key = `${event.eventId}:${language}:${translated}:${this.context.sampleRate}`; if (this.bufferCache.has(key)) return this.bufferCache.get(key);
    const samples = synthesiseSoundEvent(event, this.context.sampleRate, language, translated); this.bufferCache.set(key, samples); while (this.bufferCache.size > 64) this.bufferCache.delete(this.bufferCache.keys().next().value); return samples;
  }
  #render(event, { gain = 1, lowpassHz = 20000, position = event.position, translated = false, language = this.settings.soundLanguage, preview = false } = {}) {
    if (!this.context || this.context.state !== "running" || (!preview && !this.enabled) || this.active.size >= this.maximumVoices || !language) return false;
    const now = this.context.currentTime, playKey = `${event.eventId}:${language}`, lastPlayed = this.played.get(playKey); if (!preview && lastPlayed != null && now - lastPlayed < Math.max(.35, event.durationSeconds * .7)) return false;
    this.played.set(playKey, now); for (const [id, at] of this.played) if (now - at > 40) this.played.delete(id);
    const samples = this.#samples(event, translated, language), buffer = this.context.createBuffer(1, samples.length, this.context.sampleRate); buffer.copyToChannel(samples, 0);
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), envelope = this.context.createGain(), panner = this.context.createPanner(); source.buffer = buffer; filter.type = "lowpass"; filter.frequency.value = clamp(lowpassHz, 120, 22000); filter.Q.value = .45;
    const limit = this.settings.dynamicRange === "night" ? .5 : this.settings.dynamicRange === "reduced" ? .68 : 1; envelope.gain.value = clamp(gain, 0, limit); panner.panningModel = this.settings.spatialization === "hrtf" ? "HRTF" : "equalpower"; panner.distanceModel = "inverse"; panner.refDistance = 1; panner.maxDistance = 320; panner.rolloffFactor = .24;
    const spatial = this.settings.spatialization === "mono" ? { x: 0, y: 0, z: -1 } : position; if (panner.positionX) { panner.positionX.value = spatial.x; panner.positionY.value = spatial.y || 0; panner.positionZ.value = spatial.z; } else panner.setPosition(spatial.x, spatial.y || 0, spatial.z);
    const bus = this.buses.get(this.#busFor(event)) || this.buses.get("animals"); source.connect(filter).connect(envelope).connect(panner).connect(bus); if (this.reverb) panner.connect(this.reverb); const record = { source, filter, envelope, panner }; this.active.add(record);
    source.start(now); source.stop(now + samples.length / this.context.sampleRate + .02); source.onended = () => { for (const node of [source, filter, envelope, panner]) try { node.disconnect(); } catch {} this.active.delete(record); }; return true;
  }
  renderEvent(event, options = {}) { return this.#render(event, options); }
  async previewEvent(event, soundLanguage, options = {}) { if (!SOUND_LANGUAGE_IDS.includes(soundLanguage)) return false; if (!this.context) this.#createGraph(); await this.context.resume(); this.master.gain.setTargetAtTime(Math.max(.35, this.settings.masterVolume), this.context.currentTime, .03); return this.#render(event, { ...options, language: soundLanguage, preview: true }); }

  #ensureAmbience() {
    if (!this.context || this.ambience.size || !this.settings.soundLanguage) return;
    const durations = { wind: [17, 23], vegetation: [19, 29], "rain-foliage": [23, 31], "rain-soil": [19, 37], "rain-water": [29, 41], water: [31, 43] };
    for (const [name, busName] of [["wind", "wind"], ["vegetation", "vegetation"], ["rain-foliage", "rain"], ["rain-soil", "rain"], ["rain-water", "rain"], ["water", "river"]]) {
      const layers = [];
      for (const [layerIndex, seconds] of durations[name].entries()) {
        const ambienceRate = Math.min(this.context.sampleRate, 24000), buffer = this.context.createBuffer(1, Math.ceil(ambienceRate * seconds), ambienceRate);
        buffer.copyToChannel(ambientChannel(name, ambienceRate, seconds, hash(`ambience:${name}:${layerIndex}`), this.settings.soundLanguage, layerIndex), 0);
        const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain(), panner = name === "water" ? this.context.createPanner() : null; source.buffer = buffer; source.loop = true; gain.gain.value = 0; filter.type = name === "wind" ? "lowpass" : name === "vegetation" ? "highpass" : "bandpass"; filter.frequency.value = name === "wind" ? 620 : name === "vegetation" ? 1100 : name.startsWith("rain") ? (name === "rain-foliage" ? 3600 : name === "rain-water" ? 1200 : 2100) : 720; filter.Q.value = name.startsWith("rain") ? .25 : .45;
        source.connect(filter).connect(gain); if (panner) { panner.panningModel = this.settings.spatialization === "hrtf" ? "HRTF" : "equalpower"; panner.distanceModel = "inverse"; panner.refDistance = 2; panner.maxDistance = 180; panner.rolloffFactor = .18; gain.connect(panner).connect(this.buses.get(busName)); } else gain.connect(this.buses.get(busName)); source.start(this.context.currentTime + layerIndex * .37); layers.push({ source, filter, gain, panner });
      }
      this.ambience.set(name, layers);
    }
  }
  #disposeAmbience() { for (const layers of this.ambience.values()) for (const layer of layers) { try { layer.source.stop(); } catch {} for (const node of [layer.source, layer.filter, layer.gain, layer.panner]) try { node?.disconnect(); } catch {} } this.ambience.clear(); this.waterAnchor = null; }
  updateAmbience({ rain = 0, wind = 0, gust = 0, vegetation = 0, water = 0, waterAnchor = null, rainSurfaces = null } = {}) {
    if (!this.enabled || !this.context || this.context.state !== "running" || !this.settings.soundLanguage) return false; this.#ensureAmbience(); const time = this.context.currentTime, density = this.settings.environmentalDetailDensity, environment = this.settings.nearFarBalance;
    const audibleRain = activePrecipitationIntensity(rain), rainLevel = Math.sqrt(audibleRain) * .31 * density * environment, surfaces = rainSurfaces || { foliage: .34, soil: .46, water: .2 };
    const targets = { wind: Math.sqrt(clamp(wind, 0, 1.5)) * .19 * density * environment, vegetation: Math.sqrt(clamp(wind * vegetation, 0, 1.5)) * .16 * density * environment, "rain-foliage": rainLevel * clamp(surfaces.foliage, 0, 1), "rain-soil": rainLevel * clamp(surfaces.soil, 0, 1), "rain-water": rainLevel * clamp(surfaces.water, 0, 1), water: Math.sqrt(clamp(water, 0, 1.5)) * .23 * density * environment };
    for (const [name, target] of Object.entries(targets)) for (const [index, layer] of (this.ambience.get(name) || []).entries()) layer.gain.gain.setTargetAtTime(target * (index ? .52 : .68), time, name === "rain" ? .18 : .45);
    for (const layer of this.ambience.get("wind") || []) layer.filter.frequency.setTargetAtTime(260 + clamp(wind + gust, 0, 2) * 720, time, .35); for (const name of ["rain-foliage", "rain-soil", "rain-water"]) for (const layer of this.ambience.get(name) || []) layer.filter.frequency.setTargetAtTime((name === "rain-foliage" ? 2600 : name === "rain-water" ? 900 : 1500) + clamp(rain, 0, 1) * (name === "rain-foliage" ? 2600 : 1400), time, .22);
    if (waterAnchor && (!this.waterAnchor || this.waterAnchor.id === waterAnchor.id || time - this.waterAnchorChangedAt > 3.5 || waterAnchor.intensity > (this.waterAnchor.intensity || 0) * 1.25)) { if (this.waterAnchor?.id !== waterAnchor.id) this.waterAnchorChangedAt = time; this.waterAnchor = { ...waterAnchor }; }
    if (this.waterAnchor) for (const layer of this.ambience.get("water") || []) if (layer.panner) { if (layer.panner.positionX) { layer.panner.positionX.setTargetAtTime(this.waterAnchor.x, time, .12); layer.panner.positionY.setTargetAtTime(this.waterAnchor.y || 0, time, .12); layer.panner.positionZ.setTargetAtTime(this.waterAnchor.z, time, .12); } else layer.panner.setPosition(this.waterAnchor.x, this.waterAnchor.y || 0, this.waterAnchor.z); }
    return true;
  }
  duckForNarration(active) { if (!this.context) return; const time = this.context.currentTime, levels = audioBusLevels(this.settings); for (const name of ["animals", "movement", "wind", "vegetation", "rain", "thunder", "river", "shoreline"]) this.buses.get(name)?.gain.setTargetAtTime(active ? levels[name] * .28 : levels[name], time, active ? .08 : .4); }
  dispose() { for (const voice of this.active) try { voice.source.stop(); } catch {} this.active.clear(); this.played.clear(); this.bufferCache.clear(); this.#disposeAmbience(); if (this.context) this.context.close(); this.context = null; this.master = null; this.compressor = null; this.reverb = null; this.reverbGain = null; this.buses.clear(); }
}
