# Sound communication, perception, and acoustic ecology

## Evidence-led synthetic replacement (schema 3 settings / score schema 1)

The former common-template renderer has been replaced by a synthesis-independent `AcousticScore` and five complete renderer languages: Bioacoustic Signature, Natural Reconstruction, Analogue Ecology, Digital Ecology, and Instrumental Sonification. All five consume the same contour, amplitude, resonance, rhythm, behavioural context, evidence, uncertainty and persistent individual traits. Changing language is presentation-only and cannot alter authoritative hearing.

Audio has no implicit fallback language. Migrated installations remain unselected and muted until the player chooses a language. The selection is global presentation state and may be changed live. The comparison selector presents the same call, anatomical foot contact, wind, rain, and water scene for each language.

Every catalogue species has an explicit identity score, so no species is rendered as a generic ping. Founder scores use the existing red-deer and grey-wolf evidence; all unresolved species parameters remain visibly graded composite models rather than being misreported as exact research. Unsupported calls still remain unavailable through the public-signal rules.

Foot contact is now modal/contact synthesis driven by anatomy, substrate, mass, gait, force, moisture and displaced material. Wind, foliage, rain and water use generated turbulence plus discrete physical microevents. Their paired mutually-prime layer durations remove the exposed six-second loop and avoid one static-noise bed carrying an entire environment.

Sound settings now separate animal calls, movement, wind, vegetation, rain, thunder, rivers, shorelines, interface and narration, with environmental density, near/far balance, reverberation, dynamic range, spatial output, voice budget, captions, translated-channel labels and the visual sound overlay. Natural Reconstruction is explicitly marked as literal reconstruction; Instrumental Sonification is explicitly marked as translation.

## Implemented system

The simulation now separates emitted sound, outdoor propagation, biological reception, interpretation, and human-facing playback. Animal decisions use `AcousticObservation` records produced by the deterministic simulation. Web Audio is a presentation of those records and cannot change whether an organism heard anything.

The authoritative path is:

`source event → spectral propagation → biological thresholds and masking → acoustic observation → communication evidence → behaviour`

Animal vocalisations, movement, regional weather, rivers, and waterfalls produce bounded `SoundEvent` records. Candidate animal pairs continue to use the population spatial index. Detailed calculations use a sampled direct path through the existing terrain, including geometric spreading, atmospheric absorption, elevation obstruction, vegetation, water, wind, rain, local masking, and the listener's audiogram. The model deliberately remains an efficient outdoor approximation rather than a wave solver.

Each of the 28 catalogue species has a versioned acoustic profile with a taxon or declared model basis, sparse audiogram, production mechanism, supported repertoire, mechanical sound description, sensor anatomy, evidence grade, confidence, and known research gaps. The original Valley Grazer is acoustically based on red deer and the original Ridge Hunter on grey wolf. Both originals retain `null` catalogue visual recipes and their existing bespoke rendering branches; their separately selectable updated variants use current visible anatomy recipes.

The browser sound engine creates all ordinary simulation audio procedurally. Mammal calls now use deterministic time-domain source–filter synthesis with harmonic glottal sources, independently described vocal-tract resonances, pitch contours, jitter, roughness, breath components, syllable structure, and individual voice seeds. Bird calls use interacting swept sources, frequency modulation, trill structure, and multi-syllable envelopes. Reptile, impact, thunder, and water events use mechanism-specific noise and impulse models. No animal or environmental recording is included.

Wind, moving vegetation, rain, and nearby flowing water are continuous listener-local layers rather than short events placed at remote weather-system centres. Their amplitudes and filters crossfade from the camera or entity's actual regional weather, vegetation, and hydrology. Discrete thunder and animal events remain spatial sources. The event renderer ranks plausible audible level rather than allowing the first six semantic calls to silence the environment.

Audio is activated only by an explicit user action and uses bounded voices and separate animal, movement, wind/vegetation, rain/thunder, water, interface, and cinema buses. Persistent presentation settings provide master and per-bus volumes, ambience density, environmental balance, natural/reduced/night dynamic range, HRTF/stereo/mono output, a voice budget, translated-channel control, captions, and test buttons. Cinema narration ducks rather than destroys the diegetic soundscape.

The interface provides Human Observer, Species Lens, Entity Experience, and Physical/Scientific modes. Ultrasound and infrasound are translated only in scientific or non-human views and are labelled as translations. Entity Experience renders only events detected by the selected organism. Species Lens applies the selected species profile at the camera. Human Observer remains a human-accessible camera scene.

Separate eye sensor fields are exposed by the diagnostic vision overlay. Existing authoritative sight still shares the deterministic terrain and vegetation ray test, and now records which eye or eyes detected a target. Ear, eye, thermal-organ, and vibration-receptor definitions are simulation metadata; they do not require visible geometry.

Communication emission is separate from receiver interpretation. A semantic public signal may have acoustic, visual-posture, or chemical forms. Unsupported acoustic calls are removed from the embodied wheel and rejected by direct commands, while an appropriate non-vocal public posture can remain available. Call cards remain human-facing presentation only.

The world retains a compact cell-level trace field for footprints and body scent. Soft substrates admit footprints; rain degrades physical traces, while rain and wind affect scent separately. Near-camera decals remain presentation work rather than simulation objects.

Localized weather now refreshes after systems move a meaningful fraction of a field cell. The field is encoded as an RGBA `DataTexture` carrying cloud cover, precipitation, wetness, and solar illumination. Camera-local precipitation, distant precipitation curtains, and water roughness use the same regional weather authority that contributes acoustic masking.

World schema 6 stores deterministic individual voice traits and compact traces. Schema 5 worlds migrate without consuming simulation randomness. Active Web Audio nodes, buffers, transient sound events, and sensory-view settings are not saved.

## Evidence policy and current readiness

The shipped catalogue is deliberately conservative. The Valley Grazer's courtship/threat roar shapes now use exact-species red-deer source–filter literature; the Ridge Hunter's contact/separation howl shapes use exact-species grey-wolf measurements of duration, fundamental-frequency range, harmonics, modulation, and individuality. Other repertoire entries remain visibly graded `composite-model` until their species-by-species primary research gate is complete. A complete-looking schema is not treated as completed evidence.

All intentional downloads are confined to `Sound communication and perception/Research references/downloads`, which is excluded from Git. The versioned ledger, derived parameter records, and generated comparison manifest sit beside it. `npm run render:acoustic-comparisons` regenerates founder WAV comparisons into the ignored `derived/audio` directory. Those files are synthesized outputs, not source recordings.

No source recording is a runtime or distributable asset. Future measurements must record archive ID, URL, recordist, licence, access date, taxon, population, context, and exact segment. Numerical values must state whether they came from a publication table, figure, supplied annotation, or project measurement.

## Verification

Automated tests cover all-species profile completeness, evidence grades, the recording-free rule, deterministic waveform samples and observations, settings bounds, bus coverage, masking and terrain attenuation, unsupported calls, trace decay, sensory perspectives, field-texture encoding, and separate eye reporting. A focused browser test activates Web Audio, exercises the Settings panel, persists night/mono choices, and plays the rain test channel without a page error.
