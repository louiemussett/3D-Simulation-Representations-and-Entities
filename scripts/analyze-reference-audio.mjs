import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const referenceRoot = path.join(projectRoot, "Sound communication and perception", "Research references");
const inputPath = path.resolve(process.argv[2] || path.join(referenceRoot, "downloads", "recordings", "Wolf-howls-USFWS-public-domain.ogg"));
const measurementPath = path.resolve(process.argv[3] || path.join(referenceRoot, "derived", "measurements", "usfws-wolf-howls.json"));
const spectrogramPath = path.resolve(process.argv[4] || path.join(referenceRoot, "derived", "spectrograms", "usfws-wolf-howls.png"));

await mkdir(path.dirname(measurementPath), { recursive: true });
await mkdir(path.dirname(spectrogramPath), { recursive: true });

const encodedAudio = (await readFile(inputPath)).toString("base64");
const installedChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH || (existsSync(installedChrome) ? installedChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 620 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#101719;color:#e8f1ee;font:14px system-ui">
  <canvas id="spectrogram" width="1280" height="620"></canvas>
</body></html>`);

const measurements = await page.evaluate(async ({ encodedAudio, sourceName }) => {
  const bytes = Uint8Array.from(atob(encodedAudio), (character) => character.charCodeAt(0));
  const context = new AudioContext();
  const decoded = await context.decodeAudioData(bytes.buffer.slice(0));
  const sampleRate = decoded.sampleRate;
  const channelCount = decoded.numberOfChannels;
  const sampleCount = decoded.length;
  const mono = new Float32Array(sampleCount);
  for (let channel = 0; channel < channelCount; channel += 1) {
    const data = decoded.getChannelData(channel);
    for (let index = 0; index < sampleCount; index += 1) mono[index] += data[index] / channelCount;
  }

  let peak = 0;
  let sumSquares = 0;
  for (const sample of mono) {
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
  }

  const fftSize = 2048;
  const hopSize = 512;
  const bins = fftSize / 2;
  const window = Float64Array.from({ length: fftSize }, (_, index) => 0.5 - (0.5 * Math.cos((2 * Math.PI * index) / (fftSize - 1))));
  const reverseBits = (value, bitCount) => {
    let result = 0;
    for (let bit = 0; bit < bitCount; bit += 1) result = (result << 1) | ((value >>> bit) & 1);
    return result;
  };
  const bitCount = Math.log2(fftSize);
  const reversed = Uint16Array.from({ length: fftSize }, (_, index) => reverseBits(index, bitCount));
  const spectrum = (offset) => {
    const real = new Float64Array(fftSize);
    const imaginary = new Float64Array(fftSize);
    for (let index = 0; index < fftSize; index += 1) real[reversed[index]] = (mono[offset + index] || 0) * window[index];
    for (let size = 2; size <= fftSize; size *= 2) {
      const half = size / 2;
      const angleStep = (-2 * Math.PI) / size;
      for (let start = 0; start < fftSize; start += size) {
        for (let index = 0; index < half; index += 1) {
          const angle = angleStep * index;
          const cosine = Math.cos(angle);
          const sine = Math.sin(angle);
          const even = start + index;
          const odd = even + half;
          const oddReal = real[odd] * cosine - imaginary[odd] * sine;
          const oddImaginary = real[odd] * sine + imaginary[odd] * cosine;
          real[odd] = real[even] - oddReal;
          imaginary[odd] = imaginary[even] - oddImaginary;
          real[even] += oddReal;
          imaginary[even] += oddImaginary;
        }
      }
    }
    return Float32Array.from({ length: bins }, (_, index) => Math.hypot(real[index], imaginary[index]) / fftSize);
  };

  const frames = [];
  const frameCount = Math.max(1, Math.floor((sampleCount - fftSize) / hopSize));
  let maximumMagnitude = 1e-9;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const magnitudes = spectrum(frame * hopSize);
    let energy = 0;
    let weighted = 0;
    let magnitudeSum = 0;
    let dominantBin = 1;
    let dominantMagnitude = 0;
    for (let bin = 1; bin < bins; bin += 1) {
      const magnitude = magnitudes[bin];
      const frequency = (bin * sampleRate) / fftSize;
      energy += magnitude * magnitude;
      weighted += frequency * magnitude;
      magnitudeSum += magnitude;
      maximumMagnitude = Math.max(maximumMagnitude, magnitude);
      if (frequency >= 50 && frequency <= 4000 && magnitude > dominantMagnitude) {
        dominantMagnitude = magnitude;
        dominantBin = bin;
      }
    }
    const minimumPitchBin = Math.ceil((55 * fftSize) / sampleRate);
    const maximumPitchBin = Math.floor((700 * fftSize) / sampleRate);
    let harmonicBin = minimumPitchBin;
    let harmonicScore = -Infinity;
    for (let bin = minimumPitchBin; bin <= maximumPitchBin; bin += 1) {
      const score = Math.log(magnitudes[bin] + 1e-10)
        + 0.7 * Math.log(magnitudes[bin * 2] + 1e-10)
        + 0.45 * Math.log(magnitudes[bin * 3] + 1e-10);
      if (score > harmonicScore) {
        harmonicScore = score;
        harmonicBin = bin;
      }
    }
    frames.push({
      timeSeconds: (frame * hopSize) / sampleRate,
      energy,
      dominantFrequencyHz: (dominantBin * sampleRate) / fftSize,
      spectralCentroidHz: magnitudeSum > 0 ? weighted / magnitudeSum : 0,
      provisionalHarmonicFundamentalHz: (harmonicBin * sampleRate) / fftSize,
      magnitudes,
    });
  }

  const energies = frames.map((frame) => frame.energy).sort((a, b) => a - b);
  const gate = energies[Math.floor(energies.length * 0.65)] || 0;
  const active = frames.filter((frame) => frame.energy >= gate);
  const summarize = (values) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    const percentile = (position) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(position * (sorted.length - 1))))] || 0;
    return {
      minimum: percentile(0),
      percentile10: percentile(0.1),
      median: percentile(0.5),
      percentile90: percentile(0.9),
      maximum: percentile(1),
    };
  };

  const canvas = document.querySelector("#spectrogram");
  const drawing = canvas.getContext("2d");
  drawing.fillStyle = "#101719";
  drawing.fillRect(0, 0, canvas.width, canvas.height);
  const left = 72;
  const top = 48;
  const width = 1178;
  const height = 500;
  const minimumHz = 40;
  const maximumHz = Math.min(12000, sampleRate / 2);
  for (let x = 0; x < width; x += 1) {
    const frame = frames[Math.min(frames.length - 1, Math.floor((x / width) * frames.length))];
    for (let y = 0; y < height; y += 2) {
      const vertical = 1 - (y / height);
      const frequency = minimumHz * Math.pow(maximumHz / minimumHz, vertical);
      const bin = Math.min(bins - 1, Math.round((frequency * fftSize) / sampleRate));
      const db = 20 * Math.log10((frame?.magnitudes[bin] || 1e-10) / maximumMagnitude);
      const intensity = Math.max(0, Math.min(1, (db + 80) / 80));
      const hue = 205 - intensity * 165;
      drawing.fillStyle = `hsl(${hue} 85% ${8 + intensity * 62}%)`;
      drawing.fillRect(left + x, top + y, 1, 2);
    }
  }
  drawing.strokeStyle = "#b8ccc6";
  drawing.strokeRect(left, top, width, height);
  drawing.fillStyle = "#e8f1ee";
  drawing.font = "20px system-ui";
  drawing.fillText("Research spectrogram — U.S. Fish & Wildlife Service wolf howls", left, 30);
  drawing.font = "12px system-ui";
  drawing.fillText("Time (seconds)", left + width / 2 - 36, 600);
  drawing.save();
  drawing.translate(18, top + height / 2 + 40);
  drawing.rotate(-Math.PI / 2);
  drawing.fillText("Frequency (log scale, Hz)", 0, 0);
  drawing.restore();
  for (const frequency of [50, 100, 250, 500, 1000, 2000, 4000, 8000]) {
    if (frequency > maximumHz) continue;
    const vertical = Math.log(frequency / minimumHz) / Math.log(maximumHz / minimumHz);
    const y = top + height * (1 - vertical);
    drawing.fillStyle = "#b8ccc6";
    drawing.fillText(String(frequency), 35, y + 4);
    drawing.strokeStyle = "rgba(220,240,235,.13)";
    drawing.beginPath();
    drawing.moveTo(left, y);
    drawing.lineTo(left + width, y);
    drawing.stroke();
  }
  for (let seconds = 0; seconds <= decoded.duration; seconds += 5) {
    const x = left + (seconds / decoded.duration) * width;
    drawing.fillText(String(seconds), x - 4, top + height + 20);
  }

  await context.close();
  return {
    schemaVersion: 1,
    sourceFile: sourceName,
    extractionMethod: "Chromium Web Audio decoding; 2048-sample Hann-window FFT with 512-sample hop; magnitude spectrogram; provisional harmonic-product estimate",
    extractionLimitations: [
      "The harmonic fundamental values are provisional spectral estimates and are not a validated pitch track.",
      "The source lacks population, individual, sex, age, microphone, distance, level, and behavioural-context metadata.",
      "Measurements are research diagnostics only and do not automatically change runtime acoustic scores.",
    ],
    audio: {
      durationSeconds: decoded.duration,
      sampleRateHz: sampleRate,
      channels: channelCount,
      sampleCount,
      peakAmplitude: peak,
      rmsAmplitude: Math.sqrt(sumSquares / sampleCount),
    },
    analysis: {
      fftSize,
      hopSize,
      frameCount,
      activeFrameGate: "top 35% of spectral-energy frames",
      activeFrameCount: active.length,
      dominantFrequencyHz: summarize(active.map((frame) => frame.dominantFrequencyHz)),
      spectralCentroidHz: summarize(active.map((frame) => frame.spectralCentroidHz)),
      provisionalHarmonicFundamentalHz: summarize(active.map((frame) => frame.provisionalHarmonicFundamentalHz)),
    },
  };
}, { encodedAudio, sourceName: path.relative(referenceRoot, inputPath).replaceAll(path.sep, "/") });

await page.locator("#spectrogram").screenshot({ path: spectrogramPath });
await browser.close();
await writeFile(measurementPath, `${JSON.stringify(measurements, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ measurementPath, spectrogramPath, measurements }, null, 2));
