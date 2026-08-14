import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAnimalSoundEvent, createIndividualAcousticTraits } from "../src/acoustic-ecology.js";
import { synthesiseSoundEvent } from "../src/procedural-audio.js";
import { SOUND_LANGUAGES } from "../src/audio-settings.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "Sound communication and perception", "Research references", "derived", "audio", "comparisons");
const sampleRate = 48000;

function wav(samples) {
  const bytes = 44 + samples.length * 2, buffer = Buffer.alloc(bytes);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(bytes - 8, 4); buffer.write("WAVE", 8); buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[index])) * 32767), 44 + index * 2);
  return buffer;
}

const definitions = [
  { stem: "Valley-Grazer-red-deer-basis-common-roar", id: "comparison-grazer", speciesId: "grazer", sex: "M", bodyMass: 190, signalKind: "courtship", sourceIds: ["hurtado-etal-red-deer-vocalisations", "garcia-etal-2013-red-deer-source-filter", "frey-etal-2012-iberian-red-deer"] },
  { stem: "Valley-Grazer-red-deer-basis-harsh-roar", id: "comparison-grazer-threat", speciesId: "grazer", sex: "M", bodyMass: 190, signalKind: "threat", sourceIds: ["hurtado-etal-red-deer-vocalisations", "frey-etal-2012-iberian-red-deer"] },
  { stem: "Valley-Grazer-red-deer-basis-bark", id: "comparison-grazer-bark", speciesId: "grazer", sex: "F", bodyMass: 120, signalKind: "alarm", sourceIds: ["hurtado-etal-red-deer-vocalisations"] },
  { stem: "Ridge-Hunter-grey-wolf-basis-howl", id: "comparison-hunter", speciesId: "hunter", sex: "F", bodyMass: 38, signalKind: "contact", sourceIds: ["palacios-etal-2007-iberian-wolf-howls"] },
  { stem: "Ridge-Hunter-grey-wolf-basis-growl", id: "comparison-hunter-growl", speciesId: "hunter", sex: "M", bodyMass: 42, signalKind: "threat", sourceIds: ["macaulay-library", "tierstimmenarchiv"] }
];

await mkdir(outputDirectory, { recursive: true });
const manifest = [];
for (const definition of definitions) {
  const animal = { ...definition, x: 0, z: 0, lifeStage: "adult" }; animal.acousticIdentity = createIndividualAcousticTraits(animal, 20260814);
  const event = createAnimalSoundEvent(animal, { tick: 1, call: { signalKind: definition.signalKind, since: 1 } });
  for (const language of SOUND_LANGUAGES) {
    const file = `${definition.stem}-${language.id}.wav`, samples = synthesiseSoundEvent(event, sampleRate, language.id); await writeFile(path.join(outputDirectory, file), wav(samples));
    manifest.push({ file, generated: true, runtimeAsset: false, distributedRecording: false, modelSpeciesId: definition.speciesId, modelBasis: definition.speciesId === "grazer" ? "Cervus elaphus" : "Canis lupus", call: definition.signalKind, acousticScoreId: event.acousticScore?.scoreId, soundLanguage: language.id, soundLanguageLabel: language.label, literalReconstruction: language.id === "natural-reconstruction", sampleRate, durationSeconds: samples.length / sampleRate, sourceIds: definition.sourceIds, warning: "Entirely synthetic research comparison; not a source recording and excluded from runtime bundles." });
  }
}
await writeFile(path.join(outputDirectory, "comparison-manifest.json"), `${JSON.stringify({ schemaVersion: 2, generatedAt: new Date().toISOString(), languages: SOUND_LANGUAGES, items: manifest }, null, 2)}\n`);
console.log(`Rendered ${manifest.length} procedural comparisons into ${outputDirectory}`);
