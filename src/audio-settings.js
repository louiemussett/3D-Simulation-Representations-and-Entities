const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const AUDIO_SETTINGS_SCHEMA = 3;
// Playback is session-only and always starts disabled. Language and mixer
// choices may persist, but opening the project never starts sound.
export const DEFAULT_AUDIO_PLAYBACK_ENABLED = false;
export const AUDIO_SETTINGS_STORAGE_KEY = "rss-laboratory-audio-settings-v3";
export const LEGACY_AUDIO_SETTINGS_STORAGE_KEY = "rss-laboratory-audio-settings-v2";
export const SOUND_LANGUAGES = Object.freeze([
  Object.freeze({ id: "bioacoustic-signature", label: "Bioacoustic Signature", literal: false, description: "Researched features emphasized within their supported ranges." }),
  Object.freeze({ id: "natural-reconstruction", label: "Natural Reconstruction", literal: true, description: "Closest entirely synthetic reconstruction of measured contours and spectra." }),
  Object.freeze({ id: "analogue-ecology", label: "Analogue Ecology", literal: false, description: "Warm oscillator and resonator rendering of the same acoustic score." }),
  Object.freeze({ id: "digital-ecology", label: "Digital Ecology", literal: false, description: "Wavetables, phase distortion and controlled low-bit texture without arcade pings." }),
  Object.freeze({ id: "instrumental-sonification", label: "Instrumental Sonification", literal: false, description: "Explicit scientific sonification using pitched and percussive instrument families." })
]);
export const SOUND_LANGUAGE_IDS = Object.freeze(SOUND_LANGUAGES.map(language => language.id));

export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  schemaVersion: AUDIO_SETTINGS_SCHEMA,
  soundLanguage: null,
  masterVolume: .72,
  animalVolume: .9,
  movementVolume: .62,
  windVolume: .7,
  vegetationVolume: .68,
  rainVolume: .82,
  thunderVolume: .86,
  riverVolume: .76,
  shorelineVolume: .72,
  interfaceVolume: .55,
  cinemaVolume: .9,
  environmentalDetailDensity: .9,
  nearFarBalance: 1,
  reverberation: .28,
  dynamicRange: "natural",
  spatialization: "hrtf",
  maximumVoices: 32,
  translatedChannels: true,
  captions: true,
  visualSoundOverlay: false
});

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const busValue = (value, modernKey, legacyKey, fallback) => finite(value[modernKey], finite(value[legacyKey], fallback));

export function normalizeAudioSettings(value = {}) {
  const defaults = DEFAULT_AUDIO_SETTINGS;
  const dynamicRange = ["natural", "reduced", "night"].includes(value.dynamicRange) ? value.dynamicRange : defaults.dynamicRange;
  const spatialization = ["hrtf", "stereo", "mono"].includes(value.spatialization) ? value.spatialization : defaults.spatialization;
  const soundLanguage = SOUND_LANGUAGE_IDS.includes(value.soundLanguage) ? value.soundLanguage : null;
  return Object.freeze({
    schemaVersion: AUDIO_SETTINGS_SCHEMA,
    soundLanguage,
    masterVolume: clamp(finite(value.masterVolume, defaults.masterVolume), 0, 1),
    animalVolume: clamp(finite(value.animalVolume, defaults.animalVolume), 0, 1.5),
    movementVolume: clamp(finite(value.movementVolume, defaults.movementVolume), 0, 1.5),
    windVolume: clamp(busValue(value, "windVolume", "windVegetationVolume", defaults.windVolume), 0, 1.5),
    vegetationVolume: clamp(busValue(value, "vegetationVolume", "windVegetationVolume", defaults.vegetationVolume), 0, 1.5),
    rainVolume: clamp(busValue(value, "rainVolume", "rainThunderVolume", defaults.rainVolume), 0, 1.5),
    thunderVolume: clamp(busValue(value, "thunderVolume", "rainThunderVolume", defaults.thunderVolume), 0, 1.5),
    riverVolume: clamp(busValue(value, "riverVolume", "waterVolume", defaults.riverVolume), 0, 1.5),
    shorelineVolume: clamp(busValue(value, "shorelineVolume", "waterVolume", defaults.shorelineVolume), 0, 1.5),
    interfaceVolume: clamp(finite(value.interfaceVolume, defaults.interfaceVolume), 0, 1.5),
    cinemaVolume: clamp(finite(value.cinemaVolume, defaults.cinemaVolume), 0, 1.5),
    environmentalDetailDensity: clamp(finite(value.environmentalDetailDensity, finite(value.ambienceDensity, defaults.environmentalDetailDensity)), 0, 1.5),
    nearFarBalance: clamp(finite(value.nearFarBalance, finite(value.environmentalBalance, defaults.nearFarBalance)), .25, 2),
    reverberation: clamp(finite(value.reverberation, defaults.reverberation), 0, 1),
    dynamicRange,
    spatialization,
    maximumVoices: Math.round(clamp(finite(value.maximumVoices, defaults.maximumVoices), 8, 64)),
    translatedChannels: value.translatedChannels !== false,
    captions: value.captions !== false,
    visualSoundOverlay: value.visualSoundOverlay === true
  });
}

export function loadAudioSettings(storage = globalThis.localStorage) {
  try {
    const modern = storage?.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (modern) return normalizeAudioSettings(JSON.parse(modern));
    const legacy = storage?.getItem(LEGACY_AUDIO_SETTINGS_STORAGE_KEY);
    return normalizeAudioSettings(legacy ? { ...JSON.parse(legacy), soundLanguage: null } : {});
  } catch { return normalizeAudioSettings(); }
}

export function saveAudioSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeAudioSettings(settings);
  try { storage?.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* Persistence can be unavailable in private contexts. */ }
  return normalized;
}

export function audioBusLevels(settings = DEFAULT_AUDIO_SETTINGS) {
  const value = normalizeAudioSettings(settings);
  return Object.freeze({
    animals: value.animalVolume,
    movement: value.movementVolume,
    wind: value.windVolume,
    vegetation: value.vegetationVolume,
    rain: value.rainVolume,
    thunder: value.thunderVolume,
    river: value.riverVolume,
    shoreline: value.shorelineVolume,
    interface: value.interfaceVolume,
    cinema: value.cinemaVolume
  });
}

export function soundLanguageDefinition(id) {
  return SOUND_LANGUAGES.find(language => language.id === id) || null;
}
