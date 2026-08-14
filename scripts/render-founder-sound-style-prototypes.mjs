import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "Sound communication and perception", "Research references", "derived", "audio", "style-prototypes");
const sampleRate = 48000;
const tau = Math.PI * 2;
const clamp = (value, low = -1, high = 1) => Math.max(low, Math.min(high, value));

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function wav(samples) {
  const bytes = 44 + samples.length * 2;
  const buffer = Buffer.alloc(bytes);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(bytes - 8, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) buffer.writeInt16LE(Math.round(clamp(samples[index]) * 32767), 44 + index * 2);
  return buffer;
}

function normalize(samples, peak = .88, targetRms = .2) {
  let maximum = .00001, energy = 0;
  for (const sample of samples) { maximum = Math.max(maximum, Math.abs(sample)); energy += sample * sample; }
  const rms = Math.sqrt(energy / Math.max(1, samples.length));
  const scale = Math.min(peak / maximum, targetRms / Math.max(.00001, rms));
  for (let index = 0; index < samples.length; index += 1) samples[index] *= scale;
  return samples;
}

function smoothEnvelope(time, duration, attack = .08, release = .18) {
  const rise = clamp(time / attack, 0, 1);
  const fall = clamp((duration - time) / release, 0, 1);
  return Math.sin(rise * Math.PI * .5) * Math.sin(fall * Math.PI * .5);
}

function midiNumber(frequency) { return Math.round(69 + 12 * Math.log2(frequency / 440)); }
function midiFrequency(frequency) { return 440 * 2 ** ((midiNumber(frequency) - 69) / 12); }
function noteName(frequency) {
  const number = midiNumber(frequency), names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[(number % 12 + 12) % 12]}${Math.floor(number / 12) - 1}`;
}

const patterns = [
  {
    id: "valley-grazer-common-roar-bout",
    label: "Valley Grazer - red-deer-basis common-roar bout",
    modelBasis: "Cervus elaphus",
    call: "common roar bout",
    totalSeconds: 6.25,
    sourceIds: ["hurtado-etal-red-deer-vocalisations", "garcia-etal-2013-red-deer-source-filter", "frey-etal-2012-iberian-red-deer"],
    measured: { meanCallDurationSeconds: 1.43, centralFundamentalHz: 132, formantSpacingHz: 245 },
    interpretation: {
      pitch: "Centred near C3; gently descending within each roar rather than treated as one fixed note.",
      rhythm: "Three sustained roars form a bout. Exact inter-roar gaps here are prototype timing, because the reviewed source did not report a population interval distribution.",
      tone: "Harmonic, formant-rich and comparatively stable; not a pure sine wave.",
      context: "Adult-male rutting call; observed both in bouts and isolation. Calling increased when intruding males roused bedded stags and when hinds returned later in the day.",
      movement: "The source describes the stag raising its head and stretching its neck during emission; it does not establish locomotion as a normal part of the call."
    },
    formantsHz: [245, 735, 1225, 1715, 2205],
    harmonicRolloff: .9,
    events: [
      { start: .15, duration: 1.43, frequencyAt: (time, progress) => 132 * (1.055 - .11 * progress + .008 * Math.sin(tau * 3.1 * time)) },
      { start: 2.25, duration: 1.31, frequencyAt: (time, progress) => 128 * (1.04 - .075 * progress + .01 * Math.sin(tau * 2.8 * time + .7)) },
      { start: 4.18, duration: 1.52, frequencyAt: (time, progress) => 135 * (1.06 - .13 * progress + .007 * Math.sin(tau * 3.3 * time + 1.1)) }
    ]
  },
  {
    id: "ridge-hunter-breaking-wavy-howl",
    label: "Ridge Hunter - grey-wolf-basis breaking-wavy solo howl",
    modelBasis: "Canis lupus",
    call: "breaking-wavy howl",
    totalSeconds: 7.2,
    sourceIds: ["palacios-etal-2007-iberian-wolf-howls"],
    measured: { observedDurationRangeSeconds: [1.1, 12.8], meanFundamentalRangeHz: [270, 720], discontinuityRangeHz: [21, 250] },
    interpretation: {
      pitch: "A long contour around G4 with wavy modulation and two audible breaks; this is a contour, not a held musical note.",
      rhythm: "One long emission. Solo howls were shorter on average than howls within choruses in the reviewed study.",
      tone: "Long harmonic stream; mean and maximum fundamental frequency, harmonics and modulation contribute to individual identity.",
      context: "Long-distance communication. Wolves produced solo howls and chorus howls; a solo howl could occur while alone or while other pack members remained silent.",
      movement: "The reviewed acoustic study does not report a reliable moving-versus-still rule, so the prototype makes no locomotion claim."
    },
    formantsHz: [780, 1170, 1950, 2730],
    harmonicRolloff: 1.08,
    events: [
      {
        start: .25,
        duration: 6.4,
        frequencyAt: (time, progress) => {
          const glide = 350 + 78 * Math.sin(Math.PI * progress) + 24 * progress;
          const wave = 22 * Math.sin(tau * (.46 * time + .018 * time * time)) + 9 * Math.sin(tau * 1.17 * time + .4);
          const breaks = progress > .34 ? 82 : 0;
          const returnBreak = progress > .7 ? -108 : 0;
          return glide + wave + breaks + returnBreak;
        }
      }
    ]
  }
];

function addLowBit(output, event, _pattern, seed) {
  const random = seededRandom(seed);
  let phase = random() * tau, held = 0;
  const startSample = Math.round(event.start * sampleRate), length = Math.round(event.duration * sampleRate);
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate, progress = index / Math.max(1, length - 1);
    const frequency = midiFrequency(event.frequencyAt(time, progress));
    phase += tau * frequency / sampleRate;
    if (index % 8 === 0) {
      const pulse = phase % tau < Math.PI * (.42 + .08 * Math.sin(time * 2.3)) ? 1 : -1;
      held = Math.round((pulse * .78 + Math.sin(phase * 2) * .18) * 15) / 15;
    }
    output[startSample + index] += held * smoothEnvelope(time, event.duration, .025, .11);
  }
}

function addPianoMap(output, event) {
  const startSample = Math.round(event.start * sampleRate);
  const stepSeconds = event.duration > 3 ? .36 : .29;
  const noteCount = Math.max(3, Math.ceil(event.duration / stepSeconds));
  for (let noteIndex = 0; noteIndex < noteCount; noteIndex += 1) {
    const noteStart = noteIndex * stepSeconds;
    const progress = noteStart / event.duration;
    const frequency = midiFrequency(event.frequencyAt(noteStart, progress));
    const noteLength = Math.min(.72, event.duration - noteStart + .18);
    const noteStartSample = startSample + Math.round(noteStart * sampleRate);
    for (let index = 0; index < Math.round(noteLength * sampleRate) && noteStartSample + index < output.length; index += 1) {
      const time = index / sampleRate;
      const strike = Math.exp(-time * 4.4) * Math.min(1, time / .0035);
      const body = Math.sin(tau * frequency * time) + .42 * Math.sin(tau * frequency * 2.006 * time) + .19 * Math.sin(tau * frequency * 3.991 * time) + .08 * Math.sin(tau * frequency * 7.03 * time);
      output[noteStartSample + index] += body * strike * .72;
    }
  }
}

function addAnalogue(output, event, _pattern, seed) {
  const random = seededRandom(seed);
  let phaseA = random(), phaseB = random(), lowpass = 0, previous = 0;
  const startSample = Math.round(event.start * sampleRate), length = Math.round(event.duration * sampleRate);
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate, progress = index / Math.max(1, length - 1);
    const frequency = event.frequencyAt(time, progress);
    phaseA = (phaseA + frequency / sampleRate) % 1;
    phaseB = (phaseB + frequency * 1.006 / sampleRate) % 1;
    const saw = (phaseA * 2 - 1) * .5 + (phaseB < .5 ? phaseB * 4 - 1 : 3 - phaseB * 4) * .5;
    const cutoff = 420 + frequency * 3.2 + 280 * Math.max(0, Math.sin(time * .8));
    const coefficient = 1 - Math.exp(-tau * Math.min(cutoff, 9000) / sampleRate);
    lowpass += coefficient * (saw - lowpass);
    const resonance = lowpass + (lowpass - previous) * .4;
    previous = lowpass;
    output[startSample + index] += Math.tanh(resonance * 1.65) * smoothEnvelope(time, event.duration, .09, .24);
  }
}

function addBiological(output, event, pattern, seed) {
  const random = seededRandom(seed);
  let phase = random() * tau, breath = 0, jitter = 0;
  const startSample = Math.round(event.start * sampleRate), length = Math.round(event.duration * sampleRate);
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate, progress = index / Math.max(1, length - 1), white = random() * 2 - 1;
    jitter = jitter * .996 + white * .004;
    breath = breath * .82 + white * .18;
    const frequency = event.frequencyAt(time, progress) * (1 + jitter * .0045);
    phase += tau * frequency / sampleRate;
    let sample = 0;
    const harmonicCount = Math.min(24, Math.floor(sampleRate * .45 / frequency));
    for (let harmonic = 1; harmonic <= harmonicCount; harmonic += 1) {
      const harmonicHz = frequency * harmonic;
      let resonance = .12;
      for (const formant of pattern.formantsHz) {
        const bandwidth = Math.max(70, formant * .12);
        resonance += 1 / (1 + ((harmonicHz - formant) / bandwidth) ** 2);
      }
      sample += Math.sin(phase * harmonic + harmonic * .07) * resonance / harmonic ** pattern.harmonicRolloff;
    }
    const intrinsicNoise = pattern.modelBasis === "Canis lupus" ? .045 : .085;
    output[startSample + index] += (sample + breath * intrinsicNoise) * smoothEnvelope(time, event.duration, pattern.modelBasis === "Canis lupus" ? .42 : .14, pattern.modelBasis === "Canis lupus" ? .68 : .28);
  }
}

const styles = [
  { id: "low-bit", label: "Low-bit identity sketch", purpose: "Makes pitch steps and rhythm unmistakable; deliberately game-like and not proposed as the scientific final voice.", render: addLowBit },
  { id: "piano-map", label: "Piano-note sonification", purpose: "Maps the measured contour to equal-tempered notes so pitch movement and timing can be heard analytically; not an animal imitation.", render: addPianoMap },
  { id: "analogue", label: "Analogue contour sketch", purpose: "Uses continuous glide, detuning and filtering to test a warm, distinctive non-literal identity.", render: addAnalogue },
  { id: "biological-synthetic", label: "Biological synthetic model", purpose: "Retains continuous pitch contour, harmonic source, vocal-tract resonances and intrinsic roughness as the candidate scientific direction.", render: addBiological }
];

await mkdir(outputDirectory, { recursive: true });
const items = [];
for (const [patternIndex, pattern] of patterns.entries()) {
  for (const [styleIndex, style] of styles.entries()) {
    const samples = new Float32Array(Math.ceil(pattern.totalSeconds * sampleRate));
    for (const [eventIndex, event] of pattern.events.entries()) style.render(samples, event, pattern, 20260814 + patternIndex * 1009 + styleIndex * 101 + eventIndex * 17);
    normalize(samples);
    const file = `${pattern.id}--${style.id}.wav`;
    await writeFile(path.join(outputDirectory, file), wav(samples));
    const notes = pattern.events.map(event => {
      const values = Array.from({ length: 5 }, (_, index) => event.frequencyAt(event.duration * index / 4, index / 4));
      return values.map(noteName);
    });
    items.push({ file, generated: true, runtimeAsset: false, patternId: pattern.id, label: pattern.label, modelBasis: pattern.modelBasis, call: pattern.call, style: style.id, styleLabel: style.label, purpose: style.purpose, sampleRate, durationSeconds: samples.length / sampleRate, approximatePianoPath: notes, measured: pattern.measured, interpretation: pattern.interpretation, sourceIds: pattern.sourceIds, warning: "Research audition only. It is not a source recording and is not installed in runtime audio." });
  }
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: "The same evidence-led pitch and rhythm pattern is rendered through four sound languages so identity, timing and biological plausibility can be compared independently.",
  styles: Object.fromEntries(styles.map(style => [style.id, { label: style.label, purpose: style.purpose }])),
  items
};
await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Rendered ${items.length} founder sound-style prototypes into ${outputDirectory}`);
