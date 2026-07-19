import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HexWorld } from "./hex-world.js";
import { authoritativeHash, authoritativeSnapshot, DevelopmentProfiler } from "./diagnostics.js";

let WORLD = 220;
let HALF = Math.floor(WORLD / 2);
let worldSetup = { size: 220, span: 3, hexDetail: 5000, startSeason: "Spring", windDirection: "west", windStrength: 1, stormIntensity: 1, rainShadow: 1, sedimentTransport: 1, herbivores: 220, carnivores: 36, relief: 1, mountains: 1, hills: 1, valleys: 1, rivers: 1, lakes: 1, woodland: 1, trees: 1, bushes: 1, longGrass: 1, rainfall: 1, climate: 1, temperatureVariation: 1, northTemperature: 8, southTemperature: 24, coldestTemperature: -12, hottestTemperature: 36 };
const WORLD_SCHEMA = 2;
const SAVE_KEY = "persistent-ecosystem-simulation-v1";
const AUTOSAVE_DB = "rss-living-laboratory-progress-v1";
const AUTOSAVE_STORE = "snapshots";
const FAVOURITES_KEY = "rss-lab-favourite-entities-v1";
const SEEDS_KEY = "rss-lab-saved-seeds-v1";
const SAVE_SLOTS_KEY = "rss-lab-save-slot-names-v1";
const MOUNTAIN_STEP = 2.1;
let terrainProfile = null;

const ui = {
  viewport: document.querySelector("#viewport"), inspector: document.querySelector(".inspector"), hudMode: document.querySelector("#hud-mode"), hudDay: document.querySelector("#hud-day"), hudPlay: document.querySelector("#hud-play"), hudMap: document.querySelector("#hud-map"), hudReality: document.querySelector("#hud-reality"), realityPanel: document.querySelector("#reality-panel"), realityClose: document.querySelector("#reality-close"), realityTerrain: document.querySelector("#reality-terrain"), realityPopulation: document.querySelector("#reality-population"), realityGroups: document.querySelector("#reality-groups"), labToggle: document.querySelector("#lab-toggle"), hudSpeed: document.querySelector("#hud-speed"), hudSpeedValue: document.querySelector("#hud-speed-value"), hudEvent: document.querySelector("#hud-event"), hudSelection: document.querySelector("#observer-selection"), hudSelectedName: document.querySelector("#hud-selected-name"), hudSelectedAction: document.querySelector("#hud-selected-action"), hudEnergy: document.querySelector("#hud-energy"), hudHealth: document.querySelector("#hud-health"), hudWater: document.querySelector("#hud-water"), hudDrive: document.querySelector("#hud-drive"), hudLock: document.querySelector("#hud-lock"), hudFavourite: document.querySelector("#hud-favourite"), runState: document.querySelector("#run-state"), viewMode: document.querySelector("#view-mode"), minimap: document.querySelector("#minimap"), minimapMode: document.querySelector("#minimap-mode"), eventFilter: document.querySelector("#event-filter"), eventLimit: document.querySelector("#event-limit"), playPause: document.querySelector("#play-pause"), step: document.querySelector("#step"), mapView: document.querySelector("#map-view"), reset: document.querySelector("#reset"), save: document.querySelector("#save"), load: document.querySelector("#load"), saveSlot: document.querySelector("#save-slot"), loadSlot: document.querySelector("#load-slot"), saveSlotList: document.querySelector("#save-slot-list"), exportSave: document.querySelector("#export-save"), importSave: document.querySelector("#import-save"), importSaveFile: document.querySelector("#import-save-file"), worldSize: document.querySelector("#world-size"), startHerbivores: document.querySelector("#start-herbivores"), startCarnivores: document.querySelector("#start-carnivores"), terrainRelief: document.querySelector("#terrain-relief"), mountainAmount: document.querySelector("#mountain-amount"), hillAmount: document.querySelector("#hill-amount"), valleyAmount: document.querySelector("#valley-amount"), riverAmount: document.querySelector("#river-amount"), lakeAmount: document.querySelector("#lake-amount"), woodlandAmount: document.querySelector("#woodland-amount"), treeDensity: document.querySelector("#tree-density"), bushDensity: document.querySelector("#bush-density"), longGrass: document.querySelector("#long-grass"), rainfallAmount: document.querySelector("#rainfall-amount"), climateAmount: document.querySelector("#climate-amount"), lockEntity: document.querySelector("#lock-entity"), favouriteEntity: document.querySelector("#favourite-entity"), saveSeed: document.querySelector("#save-seed"), favouriteList: document.querySelector("#favourite-list"), seedList: document.querySelector("#seed-list"), speed: document.querySelector("#speed"), speedValue: document.querySelector("#speed-value"), speedMultiplier: document.querySelector("#speed-multiplier"), feedbackMode: document.querySelector("#feedback-mode"), day: document.querySelector("#day"), season: document.querySelector("#season"), weather: document.querySelector("#weather"), plants: document.querySelector("#plants"), herbivores: document.querySelector("#herbivores"), carnivores: document.querySelector("#carnivores"), births: document.querySelector("#births"), deaths: document.querySelector("#deaths"), selectedName: document.querySelector("#selected-name"), selectedKind: document.querySelector("#selected-kind"), selectedSex: document.querySelector("#selected-sex"), selectedAge: document.querySelector("#selected-age"), selectedStage: document.querySelector("#selected-stage"), selectedSize: document.querySelector("#selected-size"), selectedPregnancy: document.querySelector("#selected-pregnancy"), selectedClimate: document.querySelector("#selected-climate"), selectedAction: document.querySelector("#selected-action"), selectedEnergy: document.querySelector("#selected-energy"), selectedHealth: document.querySelector("#selected-health"), selectedHydration: document.querySelector("#selected-hydration"), selectedInjuries: document.querySelector("#selected-injuries"), selectedFeeding: document.querySelector("#selected-feeding"), selectedDrive: document.querySelector("#selected-drive"), selectedExpression: document.querySelector("#selected-expression"), selectedRelation: document.querySelector("#selected-relation"), selectedMemory: document.querySelector("#selected-memory"), selectedTarget: document.querySelector("#selected-target"), selectedAwareness: document.querySelector("#selected-awareness"), priorityList: document.querySelector("#priority-list"), overlayPerception: document.querySelector("#overlay-perception"), overlaySound: document.querySelector("#overlay-sound"), overlayMemory: document.querySelector("#overlay-memory"), overlayEntityFocus: document.querySelector("#overlay-entity-focus"), overlayBiomass: document.querySelector("#overlay-biomass"), overlayWater: document.querySelector("#overlay-water"), overlayPheromone: document.querySelector("#overlay-pheromone"), events: document.querySelector("#events"), rssTrace: document.querySelector("#rss-trace"), entityIndicator: document.querySelector("#entity-indicator"), physicalViability: document.querySelector("#physicalViability"), mismatch: document.querySelector("#mismatch"), feedbackStatus: document.querySelector("#feedback-status"), driftStatus: document.querySelector("#drift-status"), performance: document.querySelector("#performance")
};
ui.overlayCalls = document.querySelector("#overlay-calls");
ui.worldPreset = document.querySelector("#world-preset");
ui.hexDetail = document.querySelector("#hex-detail");
ui.startSeason = document.querySelector("#start-season");
ui.windDirection = document.querySelector("#wind-direction");
ui.windStrength = document.querySelector("#wind-strength");
ui.stormIntensity = document.querySelector("#storm-intensity");
ui.rainShadow = document.querySelector("#rain-shadow");
ui.sedimentTransport = document.querySelector("#sediment-transport");
ui.hexDetailValue = document.querySelector("#hex-detail-value");
ui.temperatureVariation = document.querySelector("#temperature-variation");
ui.northTemperature = document.querySelector("#north-temperature");
ui.southTemperature = document.querySelector("#south-temperature");
ui.coldestTemperature = document.querySelector("#coldest-temperature");
ui.hottestTemperature = document.querySelector("#hottest-temperature");
ui.hudDetail = document.querySelector("#hud-detail-content");
ui.observerTabs = [...document.querySelectorAll("[data-observer-tab]")];
let observerDetailTab = "details";

const species = {
  grazer: { label: "Valley Grazer", diet: "plants", adultMass: 65, maxAge: 420, matureAge: 80, oldAge: 310, gestation: 60, dependency: 48, litter: [1, 1], speed: 1, vision: 8, smell: 5, hearing: 7, reproductionEnergy: 70, hungerRate: 0.18, thirstRate: 0.055, maternalCare: 0.9, herdTendency: 0.65, care: "maternal" },
  hunter: { label: "Ridge Hunter", diet: "meat", adultMass: 42, maxAge: 360, matureAge: 95, oldAge: 275, gestation: 90, dependency: 65, litter: [2, 4], speed: 1, vision: 9, smell: 8, hearing: 7, reproductionEnergy: 78, hungerRate: 0.08, thirstRate: 0.055, maternalCare: 0.72, herdTendency: 0.22, care: "maternal" }
};

const plantTypes = { grass: { nutrition: 1, growth: 0.055, max: 1 }, shrub: { nutrition: 1.4, growth: 0.028, max: 1.4 }, tree: { nutrition: 0.35, growth: 0.012, max: 2 } };
const seasons = ["Spring", "Summer", "Autumn", "Winter"];
const seasonMods = { Spring: { growth: 1.45, temp: 14, rain: 0.42, breed: 1 }, Summer: { growth: 1.08, temp: 24, rain: 0.25, breed: 0.8 }, Autumn: { growth: 0.82, temp: 11, rain: 0.38, breed: 0.35 }, Winter: { growth: 0.22, temp: 1, rain: 0.22, breed: 0 } };

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(ui.viewport.clientWidth, ui.viewport.clientHeight);
renderer.setClearColor(0x18201c);
ui.viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0f1210, 330, 900);
const camera = new THREE.PerspectiveCamera(46, ui.viewport.clientWidth / ui.viewport.clientHeight, 0.1, 1200);
camera.position.set(175, 230, 190);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI * 0.49;
scene.add(new THREE.HemisphereLight(0xf4fff2, 0x263029, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(12, 18, 10);
scene.add(sun);

const groups = { terrain: new THREE.Group(), plants: new THREE.Group(), water: new THREE.Group(), animals: new THREE.Group(), intent: new THREE.Group(), fog: new THREE.Group(), overlays: new THREE.Group(), corpses: new THREE.Group() };
Object.values(groups).forEach((g) => scene.add(g));

const mats = {
  groundA: new THREE.MeshStandardMaterial({ color: 0x1d2822, roughness: 0.95 }), groundB: new THREE.MeshStandardMaterial({ color: 0x25352d, roughness: 0.95 }), groundBase: new THREE.MeshStandardMaterial({ color: 0x2c3a30, roughness: 0.96 }), water: new THREE.MeshStandardMaterial({ color: 0x3d8fd1, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }), herbivore: new THREE.MeshStandardMaterial({ color: 0xe6bc52, roughness: 0.45, emissive: 0x2d2106 }), carnivore: new THREE.MeshStandardMaterial({ color: 0xd96cff, roughness: 0.42, emissive: 0x27082d }), herbivoreFemale: new THREE.MeshStandardMaterial({ color: 0xd7b76a, roughness: 0.52 }), herbivoreMale: new THREE.MeshStandardMaterial({ color: 0xc58f35, roughness: 0.48, emissive: 0x241305 }), carnivoreFemale: new THREE.MeshStandardMaterial({ color: 0xc96fff, roughness: 0.42, emissive: 0x23072e }), carnivoreMale: new THREE.MeshStandardMaterial({ color: 0x8c4aff, roughness: 0.42, emissive: 0x170633 }), juvenile: new THREE.MeshStandardMaterial({ color: 0xf0d88b, roughness: 0.5 }), newborn: new THREE.MeshStandardMaterial({ color: 0xf5e6b0, roughness: 0.55 }), oldAnimal: new THREE.MeshStandardMaterial({ color: 0xa6aa9d, roughness: 0.7 }), sexMarkerMale: new THREE.MeshBasicMaterial({ color: 0x8bd3ff }), sexMarkerFemale: new THREE.MeshBasicMaterial({ color: 0xff9cc8 }), corpse: new THREE.MeshStandardMaterial({ color: 0x5b4a40, roughness: 0.9 }), skeleton: new THREE.MeshStandardMaterial({ color: 0xd9d4bd, roughness: 0.85 }), perception: new THREE.MeshBasicMaterial({ color: 0x5ac7a6, transparent: true, opacity: 0.28, side: THREE.DoubleSide }), memory: new THREE.MeshBasicMaterial({ color: 0x75a7ff, transparent: true, opacity: 0.46 }), biomass: new THREE.MeshBasicMaterial({ color: 0x70ff82, transparent: true, opacity: 0.18 }), selected: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide }), grassPatch: new THREE.MeshLambertMaterial({ color: 0x4c8651 }), longGrassPatch: new THREE.MeshLambertMaterial({ color: 0x3c7441 }), forestPatch: new THREE.MeshLambertMaterial({ color: 0x24503a }), scrubPatch: new THREE.MeshLambertMaterial({ color: 0x35653a }), dryGrassPatch: new THREE.MeshLambertMaterial({ color: 0x96834e }), bushAsset: new THREE.MeshLambertMaterial({ color: 0x2d6a3b }), treeAsset: new THREE.MeshLambertMaterial({ color: 0x18482e }), dirtPatch: new THREE.MeshLambertMaterial({ color: 0x765b3e }), sandPatch: new THREE.MeshLambertMaterial({ color: 0xbca35e }), mudPatch: new THREE.MeshLambertMaterial({ color: 0x4b4033 }), wetlandPatch: new THREE.MeshLambertMaterial({ color: 0x416a4c }), rockPatch: new THREE.MeshLambertMaterial({ color: 0x69716d }), snowPatch: new THREE.MeshLambertMaterial({ color: 0xdce9e7 })
};
// High-contrast facial features make a body's front readable at close range.
mats.eye = new THREE.MeshBasicMaterial({ color: 0x1a1420 });
mats.trunk = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
// A leafless crown is deliberately a different material from a living canopy:
// it remains useful cover, but is visibly not a dense sight-blocking tree.
mats.bareTree = new THREE.MeshLambertMaterial({ color: 0x76523a });
mats.shallowWater = new THREE.MeshStandardMaterial({ color: 0x67bdf0, roughness: 0.25, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
mats.deepWater = new THREE.MeshStandardMaterial({ color: 0x1b619d, roughness: 0.2, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
mats.lily = new THREE.MeshLambertMaterial({ color: 0x5ea94e });
// Material-classed hex regions replace the old cell-colour texture.  Adjacent
// hexes share terrain vertices, while their visible land classes stay crisp.
mats.groundBase.vertexColors = false;
mats.groundBase.color.set(0xffffff);
const hexTerrainMaterials = [mats.grassPatch, mats.longGrassPatch, mats.forestPatch, mats.dirtPatch, mats.sandPatch, mats.mudPatch, mats.wetlandPatch, mats.rockPatch, mats.snowPatch, mats.water, mats.dryGrassPatch, mats.scrubPatch];
let groundMesh = null;
let groundColours = null;

const flatTerrainTile = new THREE.PlaneGeometry(1, 1);
flatTerrainTile.rotateX(-Math.PI / 2);
const memoryArrowShape = new THREE.Shape();
memoryArrowShape.moveTo(-0.72, -0.34); memoryArrowShape.lineTo(0.08, -0.34); memoryArrowShape.lineTo(0.08, -0.7); memoryArrowShape.lineTo(0.82, 0); memoryArrowShape.lineTo(0.08, 0.7); memoryArrowShape.lineTo(0.08, 0.34); memoryArrowShape.lineTo(-0.72, 0.34); memoryArrowShape.closePath();
const geos = { terrainTile: flatTerrainTile, water: new THREE.BoxGeometry(0.98, 0.05, 0.98), herbivore: new THREE.SphereGeometry(0.42, 24, 16), carnivore: new THREE.ConeGeometry(0.46, 1, 5), marker: new THREE.SphereGeometry(0.11, 12, 8), horn: new THREE.ConeGeometry(0.08, 0.26, 8), ring: new THREE.RingGeometry(0.98, 1.03, 80), memoryArrow: new THREE.ShapeGeometry(memoryArrowShape), corpse: new THREE.BoxGeometry(0.7, 0.18, 0.42), bone: new THREE.BoxGeometry(0.78, 0.07, 0.09), bush: new THREE.SphereGeometry(0.46, 8, 6), tree: new THREE.ConeGeometry(0.5, 1.8, 7), trunk: new THREE.CylinderGeometry(0.09, 0.13, 0.82, 6), fallenTree: new THREE.CylinderGeometry(0.14, 0.22, 1.9, 7) };
geos.eye = new THREE.SphereGeometry(0.05, 10, 8);
const pregnancyMat = new THREE.MeshBasicMaterial({ color: 0xff6fae, transparent: true, opacity: 0.9 });
const mateLinkMat = new THREE.MeshBasicMaterial({ color: 0xff77b7, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
const climateMats = { snow: new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.34, depthWrite: false }), heat: new THREE.MeshBasicMaterial({ color: 0xd8863b, transparent: true, opacity: 0.16, depthWrite: false }) };
const scentMats = { grazer: new THREE.MeshBasicMaterial({ color: 0x50e6c2, transparent: true, opacity: 0.42, depthWrite: false }), hunter: new THREE.MeshBasicMaterial({ color: 0xe45cff, transparent: true, opacity: 0.34, depthWrite: false }) };
const communicationMat = new THREE.MeshBasicMaterial({ color: 0xffa24b, transparent: true, opacity: 0.82 });
const fogMats = {
  unknown: new THREE.MeshBasicMaterial({ color: 0x020504, depthTest: false, depthWrite: false }),
  explored: new THREE.MeshBasicMaterial({ color: 0x4a4538, depthTest: false, depthWrite: false, transparent: true, opacity: 0.94 })
};
const VISION_FOV = Math.PI * 1.45;
const visionGeometries = new Map();
function visionGeometryFor(a) { const fov = visionFovFor(a); const id = fov.toFixed(3); if (!visionGeometries.has(id)) visionGeometries.set(id, new THREE.CircleGeometry(1, 40, -fov / 2, fov)); return visionGeometries.get(id); }
const senseMats = { vision: new THREE.MeshBasicMaterial({ color: 0x86ffad, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), smell: new THREE.MeshBasicMaterial({ color: 0x53d9ff, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }), hearing: new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }), sightContact: new THREE.MeshBasicMaterial({ color: 0x86ffad }), smellContact: new THREE.MeshBasicMaterial({ color: 0x53d9ff }), hearingContact: new THREE.MeshBasicMaterial({ color: 0xffd166 }) };

const iconMaterials = {
  pregnantGrazer: badgeMaterial("P", "#e6bc52"), pregnantHunter: badgeMaterial("P", "#d96cff"),
  infantGrazer: badgeMaterial("B", "#f3d990"), infantHunter: badgeMaterial("B", "#e2a5ff")
};
const mapBadgeMaterials = new Map();
const socialSignalMaterials = new Map();
const sexBadgeMaterials = new Map();
const emotionFaceMaterials = new Map();
const healthBarMaterials = new Map();
const thoughtBubbleMaterials = new Map();
const actionBadgeMaterials = new Map();
let heartSpriteMaterial = null;
let rejectionSpriteMaterial = null;
let attackSpriteMaterial = null;
function attackMaterial() { return attackSpriteMaterial ||= badgeMaterial("!", "#ff4d4d"); }

function badgeMaterial(text, color) { const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96; const c = canvas.getContext("2d"); c.fillStyle = "rgba(15,18,16,.9)"; c.beginPath(); c.arc(48,48,40,0,Math.PI*2); c.fill(); c.strokeStyle = color; c.lineWidth = 8; c.stroke(); c.fillStyle = color; c.font = "bold 52px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text,48,50); return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }); }
function socialSignalMaterial(kind) { if (!socialSignalMaterials.has(kind)) socialSignalMaterials.set(kind, badgeMaterial(socialSignalIcon(kind), socialSignalColour(kind))); return socialSignalMaterials.get(kind); }
function sexBadgeMaterial(sex) { if (!sexBadgeMaterials.has(sex)) sexBadgeMaterials.set(sex, badgeMaterial(sex === "M" ? "♂" : "♀", sex === "M" ? "#8bd3ff" : "#ff9cc8")); return sexBadgeMaterials.get(sex); }

function emotionState(a) {
  const hunger = Math.max(100 - a.energy, (68 - a.stomach) * 1.65);
  if ((a.mateRejectUntil || 0) > sim.tick || a.fear > 68) return a.fear > 68 ? "fear" : "angry";
  if ((a.courtshipIconUntil || 0) > sim.tick) return "love";
  if (a.health < 34 || (a.injuries || []).length > 2) return "dizzy";
  if (a.hydration < 28) return "thirsty";
  if (a.fatigue > 76 || a.stomach > 92) return "sleepy";
  if (hunger > 72) return "hungry";
  if (a.drive === "hunt" || a.drive === "protect offspring" || (a.aggression > 0.8 && a.currentAction.includes("fight"))) return "intense";
  if (a.pregnant || a.drive === "parental") return "gentle";
  if (a.stomach > 58 && a.hydration > 62 && a.fear < 15) return "happy";
  return "calm";
}

function emotionExplanation(a) {
  const state = emotionState(a);
  const reasons = {
    calm: "calm — no urgent need exceeds the expression threshold",
    happy: "happy — fed, hydrated, safe and settled",
    hungry: "hungry — energy or stomach reserve is critically low",
    thirsty: "thirsty — hydration is below 28%",
    sleepy: "sleepy — severe fatigue or over-full digestion",
    fear: "fearful — danger/fear exceeds 68",
    dizzy: "dizzy — severe injury or poor health",
    angry: (a.mateRejectUntil || 0) > sim.tick ? "angry — actively rejecting courtship" : "angry — high conflict urgency",
    intense: "intense — hunting, defending offspring, or fighting",
    love: "affectionate — active or recently completed courtship",
    gentle: "gentle — pregnancy or parental-care priority"
  };
  return reasons[state];
}

function emotionFaceMaterial(state, speciesId) {
  const id = `${speciesId}-${state}`;
  if (emotionFaceMaterials.has(id)) return emotionFaceMaterials.get(id);
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96;
  const c = canvas.getContext("2d"), outline = speciesId === "hunter" ? "#7f45c8" : "#c98428", face = speciesId === "hunter" ? "#dca7ff" : "#f2ce7f";
  const eye = (x, y, wide = false) => { c.fillStyle = "#f8fff9"; c.beginPath(); c.ellipse(x, y, wide ? 10 : 7, wide ? 13 : 9, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#244f39"; c.beginPath(); c.arc(x, y + 1, wide ? 4.8 : 3.6, 0, Math.PI * 2); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(x + 1, y - 1, 1.4, 0, Math.PI * 2); c.fill(); };
  c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.arc(49, 51, 34, 0, Math.PI * 2); c.fill(); c.fillStyle = face; c.beginPath(); c.arc(48, 46, 30, 0, Math.PI * 2); c.fill(); c.strokeStyle = outline; c.lineWidth = 3; c.stroke();
  if (state === "love") { c.fillStyle = "#f05a83"; c.font = "bold 26px serif"; c.textAlign = "center"; c.fillText("♥", 36, 49); c.fillText("♥", 60, 49); c.strokeStyle = "#f58a9e"; c.lineWidth = 4; c.beginPath(); c.moveTo(26, 62); c.lineTo(36, 65); c.moveTo(60, 65); c.lineTo(70, 62); c.stroke(); }
  else if (state === "dizzy") { c.strokeStyle = "#593d82"; c.lineWidth = 3; for (const x of [36, 60]) { c.beginPath(); c.arc(x, 45, 7, 0, Math.PI * 1.7); c.stroke(); c.beginPath(); c.arc(x, 45, 3.5, 0, Math.PI * 1.7); c.stroke(); } c.fillStyle = "#70464c"; c.fillRect(42, 64, 12, 3); }
  else if (state === "sleepy") { c.strokeStyle = "#315066"; c.lineWidth = 3; for (const x of [36, 60]) { c.beginPath(); c.arc(x, 47, 7, 0, Math.PI); c.stroke(); } c.fillStyle = "#557ca2"; c.font = "bold 18px system-ui"; c.fillText("Z", 74, 27); c.fillText("z", 82, 18); }
  else if (state === "angry" || state === "intense") { eye(36, 48); eye(60, 48); c.strokeStyle = "#5d2834"; c.lineWidth = 4; c.beginPath(); c.moveTo(26, 37); c.lineTo(43, 42); c.moveTo(70, 37); c.lineTo(53, 42); c.stroke(); c.strokeStyle = "#e54e55"; c.lineWidth = 3; c.beginPath(); c.moveTo(68, 22); c.lineTo(76, 30); c.moveTo(76, 22); c.lineTo(68, 30); c.stroke(); c.fillStyle = "#632f34"; c.fillRect(41, 65, 14, 3); }
  else if (state === "fear") { eye(36, 46, true); eye(60, 46, true); c.fillStyle = "#703b42"; c.beginPath(); c.arc(48, 65, 5, 0, Math.PI * 2); c.fill(); }
  else if (state === "thirsty") { eye(36, 47); eye(60, 47); c.strokeStyle = "#5c829d"; c.lineWidth = 3; c.beginPath(); c.moveTo(27, 38); c.lineTo(43, 36); c.moveTo(53, 36); c.lineTo(69, 38); c.stroke(); c.strokeStyle = "#8a4a4d"; c.beginPath(); c.arc(48, 66, 7, Math.PI, 0); c.stroke(); }
  else { eye(36, 46); eye(60, 46); c.strokeStyle = "#673d3d"; c.lineWidth = 3; c.beginPath(); if (state === "hungry") { c.arc(48, 67, 7, Math.PI, 0); } else { c.arc(48, 61, 8, 0, Math.PI); } c.stroke(); if (state === "gentle") { c.fillStyle = "#ef9dae"; c.beginPath(); c.arc(27, 58, 4, 0, Math.PI * 2); c.arc(69, 58, 4, 0, Math.PI * 2); c.fill(); } }
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }); emotionFaceMaterials.set(id, material); return material;
}

function healthTier(a) {
  const health = clamp(a.health, 0, 100), cap = a.healthCap ?? 100;
  if (health <= 25 || cap <= 60) return "critical";
  if (health <= 50 || cap <= 75) return "severe";
  if (health <= 75) return "injured";
  return "hurt";
}
function healthBarMaterial(a) {
  const percent = Math.round(clamp(a.health, 0, 100)), tier = healthTier(a), key = `${tier}:${percent}`;
  if (healthBarMaterials.has(key)) return healthBarMaterials.get(key);
  const canvas = document.createElement("canvas"); canvas.width = 192; canvas.height = 48;
  const c = canvas.getContext("2d"), colours = { hurt: "#6ee787", injured: "#ffd166", severe: "#ff8a4c", critical: "#ff3b4f" };
  c.fillStyle = "rgba(7,10,9,.9)"; c.beginPath(); c.roundRect(5, 5, 182, 38, tier === "critical" ? 6 : 14); c.fill();
  c.strokeStyle = tier === "critical" ? "#fff" : colours[tier]; c.lineWidth = tier === "critical" ? 5 : 3; c.stroke();
  c.fillStyle = colours[tier]; c.beginPath(); c.roundRect(12, 12, 168 * percent / 100, 24, 7); c.fill();
  if (tier === "severe" || tier === "critical") { c.fillStyle = "rgba(255,255,255,.6)"; for (let x = 22; x < 174 * percent / 100; x += 24) c.fillRect(x, 12, 5, 24); }
  c.fillStyle = "#fff"; c.font = "bold 20px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(`${percent}%`, 96, 25);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false, depthWrite: false });
  healthBarMaterials.set(key, material); return material;
}
function drawCreatureSymbol(c, speciesId, sex, x, y, scale = 1) {
  const colour = speciesId === "hunter" ? "#d96cff" : "#e6bc52";
  c.fillStyle = colour; c.beginPath(); c.ellipse(x, y, 25 * scale, 13 * scale, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + 24 * scale, y - 9 * scale, 10 * scale, 0, Math.PI * 2); c.fill();
  c.strokeStyle = colour; c.lineWidth = 5 * scale; for (const dx of [-14, 12]) { c.beginPath(); c.moveTo(x + dx * scale, y + 8 * scale); c.lineTo(x + dx * scale, y + 24 * scale); c.stroke(); }
  if (speciesId === "hunter") { c.beginPath(); c.moveTo(x - 22 * scale, y); c.lineTo(x - 38 * scale, y - 13 * scale); c.stroke(); }
  c.fillStyle = sex === "M" ? "#8bd3ff" : "#ff9cc8"; c.font = `bold ${24 * scale}px system-ui`; c.textAlign = "center"; c.fillText(sex === "M" ? "♂" : "♀", x - 29 * scale, y - 17 * scale);
}
function thoughtBubbleMaterial(a, priority) {
  const kind = String(priority || "thinking").toLowerCase(), key = `${kind}|${a.speciesId}|${a.sex}`;
  if (thoughtBubbleMaterials.has(key)) return thoughtBubbleMaterials.get(key);
  const canvas = document.createElement("canvas"); canvas.width = 224; canvas.height = 160; const c = canvas.getContext("2d");
  c.fillStyle = "rgba(249,252,247,.96)"; c.strokeStyle = "#26342c"; c.lineWidth = 5;
  c.beginPath(); c.arc(111, 65, 50, Math.PI, 0); c.arc(160, 72, 36, -1.5, 1.7); c.arc(119, 102, 51, 0, Math.PI); c.arc(65, 76, 35, 1.3, 4.8); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(67, 129, 12, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.arc(45, 146, 6, 0, Math.PI * 2); c.fill(); c.stroke();
  c.textAlign = "center"; c.textBaseline = "middle";
  if (/hunt|prey/.test(kind)) drawCreatureSymbol(c, "grazer", "F", 112, 76, .9);
  else if (/reproduction|courtship|mate/.test(kind)) { drawCreatureSymbol(c, a.speciesId, a.sex === "M" ? "F" : "M", 112, 79, .72); c.fillStyle = "#ed4f7b"; c.font = "bold 29px serif"; c.fillText("♥  ♥", 112, 39); }
  else {
    const match = [
      [/hunger|graze|food|feeding/, "🌿"], [/thirst|water|drink/, "💧"], [/fear|threat|flee/, "⚠"],
      [/fatigue|rest|sleep|recover/, "Zzz"], [/offspring|parent|dependency|caregiver|safeguard/, "🛡🐾"],
      [/scavenge|carcass/, "🦴"], [/group|social|herd/, "🐾🐾"], [/explore|wander|orient/, "✦"], [/shelter|climate/, "⌂"]
    ].find(([pattern]) => pattern.test(kind));
    const symbol = match?.[1] || "…"; c.fillStyle = /fear|threat|flee/.test(kind) ? "#e5484d" : "#254638"; c.font = `bold ${symbol.length > 3 ? 34 : 52}px system-ui`; c.fillText(symbol, 112, 76);
  }
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false, depthWrite: false });
  thoughtBubbleMaterials.set(key, material); return material;
}
function actionBadgeMaterial(action, category) {
  const key = `${action}:${category}`;
  if (actionBadgeMaterials.has(key)) return actionBadgeMaterials.get(key);
  const symbols = { fleeing: "!", "backing-away": "↶", stalking: "◎", chasing: "»", searching: "◉", listening: "))", "tracking-scent": "~", guarding: "◆", blocked: "×", resting: "Z", eating: "♧", drinking: "◆", courtship: "♥" };
  const colours = { danger: "#ff4d57", hunting: "#c774ff", food: "#c9d94e", water: "#59bdff", reproduction: "#ff78ae", family: "#f2c55c", rest: "#91a4bd", social: "#5edbd3", scavenge: "#d1aa76", exploration: "#73d3b1", unknown: "#d7ddd8" };
  const material = badgeMaterial(symbols[action] || "·", colours[category] || colours.unknown); actionBadgeMaterials.set(key, material); return material;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pickables = new Map();
let selectedId = null;
let selectedGroupId = null;
let selectedTerrain = null;
let entityLocked = false;
let terrainPickable = null;
let running = true;
let last = 0;
let accumulator = 0;
let fogCacheKey = "";
let landscapeDirty = true;
let lastLandscapeTick = -1;
let lastTerrainDetail = -1;
let lastTerrainObserverKey = "";
let renderedAnimalCount = 0;
const animalRenderCache = new Map();
const entityThoughtStates = new Map();
const entityPresentationCache = new Map();
const entityIntentCache = new Map();
const entityMotionHistory = new Map();
const perf = { frames: 0, ticks: 0, last: performance.now(), fps: 0, ticksPerSecond: 0 };
const profiler = new DevelopmentProfiler({ enabled: new URLSearchParams(window.location.search).get("profile") === "1" });
let lastMinimapTick = -Infinity;
let lastAutosaveTick = -Infinity;
let sim = null;
sim = createWorld(1337);

buildTerrain();
renderAll();
updateUI();
renderer.setAnimationLoop(loop);
restoreAutosavedProgress();

function visibleObjectCount(group) {
  let count = 0;
  group.traverse((object) => { if (object !== group && object.visible) count += 1; });
  return count;
}
function fogVertexCount() {
  let count = 0;
  groups.fog.traverse((object) => { if (object.visible && object.geometry?.attributes?.position) count += object.geometry.attributes.position.count; });
  return count;
}
function profilerResources() {
  return {
    "renderer.info.render.calls": renderer.info.render.calls,
    "renderer.info.render.triangles": renderer.info.render.triangles,
    "renderer.info.memory.geometries": renderer.info.memory.geometries,
    "renderer.info.memory.textures": renderer.info.memory.textures,
    visibleAnimals: renderedAnimalCount,
    visibleCorpses: visibleObjectCount(groups.corpses),
    visibleTrails: [...entityIntentCache.values()].filter((item) => item.root.visible && item.trail.visible).length,
    visibleConnectors: [...entityIntentCache.values()].filter((item) => item.root.visible && item.connector.visible).length,
    visibleThoughts: [...animalRenderCache.values()].filter((item) => item.visible && item.userData.thoughtBubble?.visible).length,
    visibleCallRings: [...entityIntentCache.values()].filter((item) => item.root.visible && item.callRing.visible).length,
    fogVertices: fogVertexCount()
  };
}
window.rssDiagnostics = Object.freeze({
  enable: () => profiler.setEnabled(true),
  disable: () => profiler.setEnabled(false),
  clear: () => profiler.clear(),
  report: () => profiler.report(profilerResources()),
  authoritativeSnapshot: () => authoritativeSnapshot(sim),
  authoritativeHash: () => authoritativeHash(sim),
  fixedSeedHash: (seed, ticks, setup = worldSetup) => {
    loadSeedWorld(Number(seed), setup);
    running = false;
    for (let index = 0; index < Math.max(0, Math.floor(ticks)); index += 1) tickWorld();
    return { seed: sim.seed, tick: sim.tick, hash: authoritativeHash(sim) };
  },
  prepareBaseline: (name) => {
    profiler.clear();
    selectedId = null; selectedGroupId = null; entityLocked = false; ui.realityPanel.hidden = true;
    ui.speed.value = "3"; ui.speedMultiplier.value = "1"; running = name !== "paused-visible";
    controls.target.set(0, 0, 0); camera.position.set(55, 78, 55);
    if (name === "fast") { ui.speed.value = "10"; ui.speedMultiplier.value = "5"; }
    if (name === "follow") {
      const animal = sim.animals.find((item) => item.alive && item.speciesId === "grazer" && item.lifeStage === "adult");
      if (animal) { selectedId = animal.id; entityLocked = true; controls.target.set(animal.x, terrainHeight(animal.x, animal.z), animal.z); camera.position.set(animal.x + 24, 34, animal.z + 24); }
    }
    if (name === "reality") ui.realityPanel.hidden = false;
    updateSpeedLabel(); renderAll(); updateUI();
    return { name, seed: sim.seed, tick: sim.tick, selectedId, visibleAnimals: renderedAnimalCount };
  }
});

function toggleRunning() { running = !running; const label = running ? "Pause" : "Play"; ui.playPause.textContent = label; ui.hudPlay.textContent = label; ui.runState.textContent = running ? "Running" : "Paused"; }
ui.playPause.addEventListener("click", toggleRunning);
ui.hudPlay.addEventListener("click", toggleRunning);
ui.hudMap.addEventListener("click", () => ui.mapView.click());
ui.hudReality.addEventListener("click", () => { ui.realityPanel.hidden = !ui.realityPanel.hidden; if (!ui.realityPanel.hidden) updateRealityPanel(); });
ui.realityClose.addEventListener("click", () => { ui.realityPanel.hidden = true; });
ui.realityGroups.addEventListener("click", (event) => { const id = event.target.closest("button")?.dataset.groupFocus; if (id) focusGroup(id); });
ui.labToggle.addEventListener("click", () => ui.inspector.classList.toggle("is-closed"));
ui.hudLock.addEventListener("click", toggleCameraLock);
ui.hudFavourite.addEventListener("click", () => ui.favouriteEntity.click());
ui.observerTabs.forEach((tab) => tab.addEventListener("click", () => { observerDetailTab = tab.dataset.observerTab; ui.observerTabs.forEach((item) => item.classList.toggle("is-active", item === tab)); updateUI(); }));
ui.hudDetail.addEventListener("click", (event) => {
  const memberId = event.target.closest("button")?.dataset.memberFocus;
  if (memberId) return focusMember(memberId);
  const overlay = event.target.closest("input")?.dataset.observerOverlay;
  if (!overlay) return;
  const source = ({ perception: ui.overlayPerception, sound: ui.overlaySound, calls: ui.overlayCalls, memory: ui.overlayMemory, focus: ui.overlayEntityFocus, biomass: ui.overlayBiomass, water: ui.overlayWater, scent: ui.overlayPheromone })[overlay];
  if (source) { source.checked = event.target.checked; source.dispatchEvent(new Event("change")); }
});
ui.hudSpeed.addEventListener("input", () => { ui.speed.value = ui.hudSpeed.value; updateSpeedLabel(); });
ui.step.addEventListener("click", () => { running = false; ui.playPause.textContent = "Play"; ui.runState.textContent = "Paused"; tickWorld(); });
ui.mapView.addEventListener("click", () => { selectedId = null; selectedGroupId = null; selectedTerrain = null; entityLocked = false; landscapeDirty = true; resetCamera(); renderAll(); updateUI(); });
ui.reset.addEventListener("click", () => loadSeedWorld(1337 + Math.floor(Math.random() * 9999), selectedWorldSetup()));
ui.save.addEventListener("click", () => saveProgress(false));
ui.load.addEventListener("click", () => restoreAutosavedProgress(true));
ui.saveSlot.addEventListener("click", () => saveNamedSlot());
ui.loadSlot.addEventListener("click", () => loadNamedSlot());
ui.exportSave.addEventListener("click", () => exportProgress());
document.querySelector("#export-shortcut").addEventListener("click", () => exportSlotShortcut());
ui.importSave.addEventListener("click", () => ui.importSaveFile.click());
ui.importSaveFile.addEventListener("change", (event) => importProgress(event));
ui.saveSlotList.addEventListener("click", (event) => { const remove = event.target.closest("button")?.dataset.deleteSave; if (remove) return deleteNamedSlot(remove); const name = event.target.closest("button")?.dataset.saveSlot; if (name) loadSlotByName(name); });
function toggleCameraLock() {
  const selected = selectedAnimal(), group = selectedGroupMembers();
  if (!selected && !group.length) return;
  entityLocked = !entityLocked;
  addEvent(entityLocked ? `Camera locked to ${selected ? selected.id : `${group.length}-member group`}` : "Camera lock released");
  updateUI();
}
ui.lockEntity.addEventListener("click", toggleCameraLock);
ui.favouriteEntity.addEventListener("click", () => { const a = selectedAnimal(); if (!a) return; const items = readLocalList(FAVOURITES_KEY); const entry = { id: a.id, seed: sim.seed, label: `${a.id} ${species[a.speciesId].label}` }; if (!items.some((x) => x.id === entry.id && x.seed === entry.seed)) { items.unshift(entry); writeLocalList(FAVOURITES_KEY, items.slice(0, 18)); addEvent(`${a.id} saved as favourite`); } updateUI(); });
ui.saveSeed.addEventListener("click", () => { const items = readLocalList(SEEDS_KEY); if (!items.includes(sim.seed)) { items.unshift(sim.seed); writeLocalList(SEEDS_KEY, items.slice(0, 18)); addEvent(`Saved world seed ${sim.seed}`); } updateUI(); });
ui.favouriteList.addEventListener("click", (event) => { const button = event.target.closest("button"), remove = button?.dataset.deleteFavourite; if (remove) { writeLocalList(FAVOURITES_KEY, readLocalList(FAVOURITES_KEY).filter((item) => !(item.id === remove && item.seed === Number(button.dataset.seed)))); addEvent(`Removed saved entity ${remove}`); return updateUI(); } const id = button?.dataset.favourite; if (!id) return; const item = readLocalList(FAVOURITES_KEY).find((x) => x.id === id && x.seed === Number(button.dataset.seed)); if (!item) return; if (sim.seed !== item.seed) loadSeedWorld(item.seed); selectedId = item.id; entityLocked = true; renderAll(); updateUI(); });
ui.seedList.addEventListener("click", (event) => { const button = event.target.closest("button"), remove = Number(button?.dataset.deleteSeed); if (Number.isFinite(remove)) { writeLocalList(SEEDS_KEY, readLocalList(SEEDS_KEY).filter((seed) => seed !== remove)); addEvent(`Removed saved seed ${remove}`); return updateUI(); } const seed = Number(button?.dataset.seed); if (Number.isFinite(seed)) loadSeedWorld(seed); });
const worldPresets = {
  mixed: { startSeason: "Spring", windDirection: "west", windStrength: 1, stormIntensity: 1, rainShadow: 1, sedimentTransport: 1, relief: 1, mountains: 1, hills: 1, valleys: 1, rivers: 1, lakes: 1, woodland: 1, trees: 1, bushes: 1, longGrass: 1, rainfall: 1, northTemperature: 8, southTemperature: 24, coldestTemperature: -12, hottestTemperature: 36, temperatureVariation: 1, climate: 1 },
  arid: { startSeason: "Summer", windDirection: "west", windStrength: 1.75, stormIntensity: .35, rainShadow: 1.9, sedimentTransport: 2.1, relief: .55, mountains: .35, hills: .35, valleys: .75, rivers: .25, lakes: .7, woodland: .05, trees: .05, bushes: .75, longGrass: .18, rainfall: .22, northTemperature: 14, southTemperature: 38, coldestTemperature: 1, hottestTemperature: 48, temperatureVariation: 1.5, climate: 1.35 },
  alpine: { startSeason: "Winter", windDirection: "west", windStrength: 1.35, stormIntensity: 1.65, rainShadow: 1.55, sedimentTransport: .5, relief: 1.65, mountains: 1.8, hills: .8, valleys: 1.25, rivers: 1.65, lakes: 1.1, woodland: .45, trees: .55, bushes: .45, longGrass: .3, rainfall: 1.55, northTemperature: -10, southTemperature: 8, coldestTemperature: -30, hottestTemperature: 20, temperatureVariation: 1.5, climate: 1.55 },
  maritime: { startSeason: "Spring", windDirection: "southwest", windStrength: 1.25, stormIntensity: 1.35, rainShadow: .65, sedimentTransport: .45, relief: .75, mountains: .35, hills: 1.4, valleys: .75, rivers: 1.2, lakes: .75, woodland: .8, trees: .85, bushes: 1.35, longGrass: 1.05, rainfall: 1.35, northTemperature: 7, southTemperature: 17, coldestTemperature: -6, hottestTemperature: 25, temperatureVariation: .55, climate: .65 },
  boreal: { startSeason: "Spring", windDirection: "west", windStrength: .85, stormIntensity: .9, rainShadow: 1.1, sedimentTransport: .35, relief: 1.1, mountains: .85, hills: .7, valleys: 1.2, rivers: 1.4, lakes: 1.9, woodland: 1.2, trees: 1.45, bushes: .55, longGrass: .7, rainfall: 1.6, northTemperature: -4, southTemperature: 14, coldestTemperature: -20, hottestTemperature: 25, temperatureVariation: .9, climate: 1.05 }
};
const applyWorldPreset = (name) => {
  const preset = worldPresets[name] || worldPresets.mixed;
  for (const [field, value] of Object.entries(preset)) {
    const control = ({ startSeason: ui.startSeason, windDirection: ui.windDirection, windStrength: ui.windStrength, stormIntensity: ui.stormIntensity, rainShadow: ui.rainShadow, sedimentTransport: ui.sedimentTransport, relief: ui.terrainRelief, mountains: ui.mountainAmount, hills: ui.hillAmount, valleys: ui.valleyAmount, rivers: ui.riverAmount, lakes: ui.lakeAmount, woodland: ui.woodlandAmount, trees: ui.treeDensity, bushes: ui.bushDensity, longGrass: ui.longGrass, rainfall: ui.rainfallAmount, northTemperature: ui.northTemperature, southTemperature: ui.southTemperature, coldestTemperature: ui.coldestTemperature, hottestTemperature: ui.hottestTemperature, temperatureVariation: ui.temperatureVariation, climate: ui.climateAmount })[field];
    if (control) control.value = value;
  }
  const description = { mixed: "Balanced grassland, woodland and water", arid: "Hot, dry ground with sandy basins and seasonal water", alpine: "Cold highlands with snow, headwaters and rocky slopes", maritime: "Cool wet hills, grassland, scrub and woodland", boreal: "Cold forest, many lakes and long winters" }[name] || "Choose a preset, then Reset";
  const output = document.querySelector("#world-preset-value"); if (output) output.textContent = description;
  updateWorldSetupLabels();
};
ui.worldPreset?.addEventListener("change", () => applyWorldPreset(ui.worldPreset.value));
[ui.worldSize, ui.hexDetail, ui.startSeason, ui.windDirection, ui.startHerbivores, ui.startCarnivores, ui.terrainRelief, ui.mountainAmount, ui.hillAmount, ui.valleyAmount, ui.riverAmount, ui.lakeAmount, ui.woodlandAmount, ui.treeDensity, ui.bushDensity, ui.longGrass, ui.rainfallAmount, ui.windStrength, ui.stormIntensity, ui.rainShadow, ui.sedimentTransport, ui.northTemperature, ui.southTemperature, ui.coldestTemperature, ui.hottestTemperature, ui.temperatureVariation, ui.climateAmount].forEach((input) => input?.addEventListener("input", updateWorldSetupLabels));
ui.minimapMode?.addEventListener("change", () => { lastMinimapTick = -1; drawMinimap(); });
ui.eventFilter?.addEventListener("change", updateUI);
ui.eventLimit?.addEventListener("change", updateUI);
[ui.overlayPerception, ui.overlaySound, ui.overlayMemory, ui.overlayEntityFocus, ui.overlayBiomass, ui.overlayWater, ui.overlayPheromone].forEach((el) => el.addEventListener("change", () => { if (el === ui.overlayBiomass || el === ui.overlayWater || el === ui.overlayEntityFocus) landscapeDirty = true; renderAll(); updateUI(); }));
ui.overlayCalls?.addEventListener("change", () => { renderAll(); updateUI(); });
ui.feedbackMode.addEventListener("change", () => addEvent(`Feedback pathway changed to ${ui.feedbackMode.value}`));
function requestedTicksPerSecond() { return Number(ui.speed.value) * Number(ui.speedMultiplier.value); }
function updateSpeedLabel() { const value = `${requestedTicksPerSecond()} sim ticks/s`; ui.speedValue.textContent = value; ui.hudSpeedValue.textContent = value; ui.hudSpeed.value = ui.speed.value; }
ui.speed.addEventListener("input", updateSpeedLabel);
ui.speedMultiplier.addEventListener("change", updateSpeedLabel);
updateSpeedLabel();
updateWorldSetupLabels();
renderer.domElement.addEventListener("pointerdown", selectObject);
window.addEventListener("resize", resize);
window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveProgress(true); });
window.addEventListener("pagehide", () => saveProgress(true));

function loop(now) {
  const delta = Math.min(80, now - last || 16);
  last = now;
  if (running) {
    accumulator += delta * requestedTicksPerSecond() / 1000;
    while (accumulator >= 1) { tickWorld(); accumulator -= 1; }
  }
  profiler.measure("frame presentation update", () => syncAnimalVisuals(now));
  profiler.measure("controls/camera", () => {
    followSelected();
    // Keep free camera exploration within the same visible world boundary. Move
    // the camera by the same amount so this is a clamp, not a disorienting snap.
    const panLimit = Math.max(8, HALF - 4), clampedX = clamp(controls.target.x, -panLimit, panLimit), clampedZ = clamp(controls.target.z, -panLimit, panLimit);
    if (clampedX !== controls.target.x || clampedZ !== controls.target.z) { camera.position.x += clampedX - controls.target.x; camera.position.z += clampedZ - controls.target.z; controls.target.set(clampedX, controls.target.y, clampedZ); }
    controls.update();
  });
  profiler.measure("Three.js render", () => renderer.render(scene, camera));
  perf.frames += 1;
  if (now - perf.last >= 1000) {
    const elapsed = now - perf.last;
    perf.fps = Math.round(perf.frames * 1000 / elapsed);
    perf.ticksPerSecond = Math.round(perf.ticks * 1000 / elapsed);
    perf.frames = 0; perf.ticks = 0; perf.last = now;
  }
}

function selectedWorldSetup() {
  const slider = (input, fallback = 1, max = 2) => clamp(Number.isFinite(Number(input?.value)) ? Number(input.value) : fallback, 0, max);
  const span = clamp(Math.round(Number(ui.worldSize?.value) || 3), 1, 4), spans = { 1: 90, 2: 150, 3: 220, 4: 300 };
  const northTemperature = clamp(Number(ui.northTemperature?.value ?? 8), -12, 18), southTemperature = clamp(Number(ui.southTemperature?.value ?? 24), 8, 38), coldestTemperature = clamp(Number(ui.coldestTemperature?.value ?? -12), -30, 5), hottestTemperature = clamp(Number(ui.hottestTemperature?.value ?? 36), 18, 50);
  return { size: spans[span], span, hexDetail: clamp(Number(ui.hexDetail?.value) || 5000, 5000, 40000), startSeason: seasons.includes(ui.startSeason?.value) ? ui.startSeason.value : "Spring", windDirection: ["west", "southwest", "south", "southeast", "east"].includes(ui.windDirection?.value) ? ui.windDirection.value : "west", windStrength: slider(ui.windStrength, 1, 3), stormIntensity: slider(ui.stormIntensity, 1, 3), rainShadow: slider(ui.rainShadow, 1, 3), sedimentTransport: slider(ui.sedimentTransport, 1, 3), herbivores: clamp(Math.floor(Number(ui.startHerbivores?.value) || 0), 0, 500), carnivores: clamp(Math.floor(Number(ui.startCarnivores?.value) || 0), 0, 200), relief: slider(ui.terrainRelief), mountains: slider(ui.mountainAmount), hills: slider(ui.hillAmount), valleys: slider(ui.valleyAmount), rivers: slider(ui.riverAmount, 1, 3), lakes: slider(ui.lakeAmount, 1, 3), woodland: slider(ui.woodlandAmount), trees: slider(ui.treeDensity, 1, 3), bushes: slider(ui.bushDensity, 1, 3), longGrass: slider(ui.longGrass, 1, 3), rainfall: slider(ui.rainfallAmount, 1, 3), northTemperature: Math.min(northTemperature, southTemperature), southTemperature: Math.max(northTemperature, southTemperature), coldestTemperature: Math.min(coldestTemperature, hottestTemperature - 1), hottestTemperature: Math.max(hottestTemperature, coldestTemperature + 1), temperatureVariation: slider(ui.temperatureVariation, 1, 3), climate: slider(ui.climateAmount) };
}
function setWorldSetup(setup = worldSetup) { worldSetup = { ...worldSetup, ...setup }; WORLD = worldSetup.size; HALF = WORLD / 2; }
function updateWorldSetupLabels() { const setup = selectedWorldSetup(); const set = (id, value) => { const el = document.querySelector(id); if (el) el.textContent = value; }; const amount = (v) => v === 0 ? "None · 0.00×" : `${v < 0.75 ? "Low" : v > 1.25 ? "High" : "Normal"} · ${v.toFixed(2)}×`; const contrast = setup.temperatureVariation === 0 ? "Uniform · temperate" : setup.temperatureVariation < .75 ? "Subtle · mixed regions" : setup.temperatureVariation > 1.6 ? "Strong · hot/cold regions" : "Normal · mixed regions"; const spanName = ["", "Compact", "Medium", "Standard", "Vast"][setup.span]; set("#world-size-value", `${spanName} physical span`); if (ui.hexDetailValue) ui.hexDetailValue.textContent = `${setup.hexDetail.toLocaleString()} connected hexes`; set("#start-herbivores-value", String(setup.herbivores)); set("#start-carnivores-value", String(setup.carnivores)); set("#terrain-relief-value", setup.relief === 0 ? "Flat · 0.00×" : amount(setup.relief)); set("#mountain-amount-value", amount(setup.mountains)); set("#hill-amount-value", amount(setup.hills)); set("#valley-amount-value", amount(setup.valleys)); set("#river-amount-value", amount(setup.rivers)); set("#lake-amount-value", amount(setup.lakes)); set("#woodland-amount-value", amount(setup.woodland)); set("#tree-density-value", amount(setup.trees)); set("#bush-density-value", amount(setup.bushes)); set("#long-grass-value", amount(setup.longGrass)); set("#rainfall-amount-value", amount(setup.rainfall)); set("#wind-strength-value", amount(setup.windStrength)); set("#storm-intensity-value", amount(setup.stormIntensity)); set("#rain-shadow-value", amount(setup.rainShadow)); set("#sediment-transport-value", amount(setup.sedimentTransport)); set("#north-temperature-value", `${setup.northTemperature <= 4 ? "Cold" : "Cool"} · ${setup.northTemperature}°C`); set("#south-temperature-value", `${setup.southTemperature >= 28 ? "Hot" : "Warm"} · ${setup.southTemperature}°C`); set("#coldest-temperature-value", `${setup.coldestTemperature}°C`); set("#hottest-temperature-value", `${setup.hottestTemperature}°C`); set("#temperature-variation-value", contrast); set("#climate-amount-value", amount(setup.climate)); }
function syncWorldSetupInputs() { if (ui.worldSize) ui.worldSize.value = worldSetup.span ?? 3; if (ui.hexDetail) ui.hexDetail.value = worldSetup.hexDetail ?? 5000; if (ui.startSeason) ui.startSeason.value = seasons.includes(worldSetup.startSeason) ? worldSetup.startSeason : "Spring"; if (ui.windDirection) ui.windDirection.value = worldSetup.windDirection ?? "west"; if (ui.windStrength) ui.windStrength.value = worldSetup.windStrength ?? 1; if (ui.stormIntensity) ui.stormIntensity.value = worldSetup.stormIntensity ?? 1; if (ui.rainShadow) ui.rainShadow.value = worldSetup.rainShadow ?? 1; if (ui.sedimentTransport) ui.sedimentTransport.value = worldSetup.sedimentTransport ?? 1; if (ui.startHerbivores) ui.startHerbivores.value = worldSetup.herbivores; if (ui.startCarnivores) ui.startCarnivores.value = worldSetup.carnivores; if (ui.terrainRelief) ui.terrainRelief.value = worldSetup.relief; if (ui.mountainAmount) ui.mountainAmount.value = worldSetup.mountains; if (ui.hillAmount) ui.hillAmount.value = worldSetup.hills; if (ui.valleyAmount) ui.valleyAmount.value = worldSetup.valleys; if (ui.riverAmount) ui.riverAmount.value = worldSetup.rivers; if (ui.lakeAmount) ui.lakeAmount.value = worldSetup.lakes; if (ui.woodlandAmount) ui.woodlandAmount.value = worldSetup.woodland; if (ui.treeDensity) ui.treeDensity.value = worldSetup.trees ?? 1; if (ui.bushDensity) ui.bushDensity.value = worldSetup.bushes ?? 1; if (ui.longGrass) ui.longGrass.value = worldSetup.longGrass ?? 1; if (ui.rainfallAmount) ui.rainfallAmount.value = worldSetup.rainfall ?? 1; if (ui.northTemperature) ui.northTemperature.value = worldSetup.northTemperature ?? 8; if (ui.southTemperature) ui.southTemperature.value = worldSetup.southTemperature ?? 24; if (ui.coldestTemperature) ui.coldestTemperature.value = worldSetup.coldestTemperature ?? -12; if (ui.hottestTemperature) ui.hottestTemperature.value = worldSetup.hottestTemperature ?? 36; if (ui.temperatureVariation) ui.temperatureVariation.value = worldSetup.temperatureVariation ?? 1; if (ui.climateAmount) ui.climateAmount.value = worldSetup.climate; updateWorldSetupLabels(); }
function createWorld(seed, setup = worldSetup) {
  setWorldSetup(setup);
  const rng = mulberry32(seed);
  const hexWorld = new HexWorld(seed, worldSetup);
  terrainProfile = null;
  const occupied = new Set();
  const randomLandHex = () => {
    for (let tries = 0; tries < 500; tries++) {
      const c = hexWorld.cells[Math.floor(rng() * hexWorld.cells.length)];
      const k = key(c);
      if (!occupied.has(k) && !c.water && !c.rocky && c.plantType !== "tree") { occupied.add(k); return c; }
    }
    return hexWorld.cells.find((c) => !c.water) || hexWorld.cells[0];
  };
  const animals = [];
  for (let i = 0; i < worldSetup.herbivores; i++) animals.push(makeAnimal(`H${i + 1}`, "grazer", i % 2 === 0 ? "F" : "M", randomLandHex(), rng, 35 + rng() * 210));
  for (let i = 0; i < worldSetup.carnivores; i++) animals.push(makeAnimal(`C${i + 1}`, "hunter", i % 2 === 0 ? "F" : "M", randomLandHex(), rng, 55 + rng() * 190));
  const season = seasons.includes(worldSetup.startSeason) ? worldSetup.startSeason : "Spring";
  const seasonal = seasonMods[season];
  return { worldSchema: WORLD_SCHEMA, seed, worldSetup: { ...worldSetup }, rngState: seed, tick: 0, day: 1, season, weather: { type: season === "Winter" ? "Cold clear" : season === "Summer" ? "Warm settled" : "Settled", temp: seasonal.temp, rain: seasonal.rain, wind: 0.3 }, weatherSystems: [], activeScent: {}, hexWorld, cells: hexWorld.cells, water: hexWorld.cells.filter((c) => c.water).map((c) => c.id), hydrology: { model: "hex-basin-hydrology-v2" }, animals, relationships: [], corpses: [], events: [], births: 0, deaths: 0, nextId: 1000 };
}

function legacySquareWorld(seed, setup = worldSetup) {
  setWorldSetup(setup);
  const rng = mulberry32(seed);
  terrainProfile = createTerrainProfile(seed);
  const cells = [];
  for (let z = -HALF; z < HALF; z++) {
    for (let x = -HALF; x < HALF; x++) {
      cells.push({ x, z, elevation: terrainHeight(x, z), fertility: 0, moisture: 0, groundwater: 0, biomass: 0, grassHeight: 0, grazingPressure: 0, plantType: "grass", woodland: false, water: false, waterChannel: false, permanentWater: false, waterLevel: 0, surfaceWater: 0, snowPack: 0, scent: null, plantAge: rng() * 120, plantStage: "mature", seedStore: rng() * 0.3, substrate: "loam", wetland: false, floodplain: false, riparian: false, lakeBasin: false });
    }
  }
  const hydrology = deriveTerrainFields(cells, rng);
  const water = new Set();
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    c.moisture = clamp(0.18 + c.soilDepth * 0.3 + Math.min(0.42, Math.log1p(c.accumulation) * 0.045) + (c.water ? 0.35 : 0) + (c.wetland ? 0.3 : 0) + ((worldSetup.rainfall ?? 1) - 1) * 0.16, 0, 1);
    c.fertility = clamp(0.16 + c.soilDepth * 0.46 + (c.floodplain ? 0.22 : 0) + (c.basin ? 0.12 : 0) + rng() * 0.12, 0.05, 1);
    // Woodland is now a consequence of durable soil moisture and stable ground,
    // not of the old decorative sine-wave placement mask.
    const woodlandSetting = worldSetup.woodland ?? 1;
    c.woodland = woodlandSetting > 0 && !c.water && !c.wetland && !c.rocky && !c.sandy && c.slope < 0.28 && c.soilDepth > 0.56 && c.moisture > (0.76 - woodlandSetting * 0.15) && (c.riparian || c.floodplain || c.moisture > (0.88 - woodlandSetting * 0.14));
    c.plantType = c.woodland ? (rng() > clamp(0.58 - (worldSetup.trees ?? 1) * 0.24, 0.08, 0.8) ? "tree" : "shrub") : "grass";
    c.biomass = (c.water || c.rocky || c.sandy || c.wetland) ? 0 : clamp(0.12 + c.fertility * 0.46 + c.moisture * 0.34 + rng() * 0.14, 0, plantTypes[c.plantType].max);
    c.grassHeight = c.woodland ? 0 : clamp(c.biomass * (0.42 + c.moisture * 0.58) * (worldSetup.longGrass ?? 1), 0, 1);
    c.terrainClass = landClass(c, 14);
    if (c.water) water.add(key(c));
  }
  // Enabled water controls must have visible results on the very first frame.
  // Lakes are clipped to their actual below-water basin, never their full
  // decorative ellipse; daily hydrology can then expand or shrink that basin.
  const markWater = (c, level, channel = false) => {
    if (!c) return;
    c.water = true; c.drinkable = true; c.waterChannel ||= channel;
    c.waterLevel = Math.max(c.waterLevel || 0, level); c.biomass = 0; c.woodland = false;
    c.terrainClass = "shallowWater"; water.add(key(c));
  };
  if ((worldSetup.lakes ?? 1) > 0) {
    for (const lake of terrainProfile.lakes) {
      for (const c of cells) {
        if (lakeLevelAt(c.x, c.z) === null) continue;
        c.lakeLevel = lake.level;
        markWater(c, 0.9, true);
      }
    }
  }
  if ((worldSetup.rivers ?? 1) > 0) {
    for (const source of terrainProfile.headwaters) {
      let index = (clamp(Math.round(source.z), -HALF, HALF - 1) + HALF) * WORLD + clamp(Math.round(source.x), -HALF, HALF - 1) + HALF;
      const visited = new Set();
      for (let step = 0; step < 220 && index >= 0 && !visited.has(index); step++) {
        visited.add(index);
        const c = cells[index];
        markWater(c, c.headwater ? 0.62 : 0.48, true);
        if (c.lakeLevel !== null || c.flowTo < 0) break;
        index = c.flowTo;
      }
    }
  }
  const animals = [];
  const occupied = new Set(water);
  // Alternate sexes at creation: every even population is exactly 50/50;
  // an odd population differs by only one individual.
  for (let i = 0; i < worldSetup.herbivores; i++) animals.push(makeAnimal(`H${i + 1}`, "grazer", i % 2 === 0 ? "F" : "M", randomLandCell(rng, occupied), rng, 35 + rng() * 210));
  for (let i = 0; i < worldSetup.carnivores; i++) animals.push(makeAnimal(`C${i + 1}`, "hunter", i % 2 === 0 ? "F" : "M", randomLandCell(rng, occupied), rng, 55 + rng() * 190));
  return { seed, worldSetup: { ...worldSetup }, rngState: seed, tick: 0, day: 1, season: "Spring", weather: { type: "Clear", temp: 14, rain: 0, wind: 0.3 }, weatherSystems: createWeatherSystems(), activeScent: {}, cells, water: [...water], hydrology, animals, relationships: [], corpses: [], events: [], births: 0, deaths: 0, nextId: 1000 };
}

function deriveTerrainFields(cells, rng) {
  const offsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const indexAt = (x, z) => (z + HALF) * WORLD + x + HALF;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]; let lowest = c.elevation, to = -1;
    for (const [dx, dz] of offsets) { const nx = c.x + dx, nz = c.z + dz; if (nx < -HALF || nx >= HALF || nz < -HALF || nz >= HALF) continue; const n = cells[indexAt(nx, nz)]; if (n.elevation < lowest - 0.018) { lowest = n.elevation; to = indexAt(nx, nz); } }
    const edge = Math.abs(c.x) >= HALF - 1 || Math.abs(c.z) >= HALF - 1;
    c.flowTo = to; c.outlet = edge && to < 0; c.lakeBasin = lakeInfluence(c.x, c.z) > 0.52; c.basin = (!edge && to < 0) || c.lakeBasin; c.slope = clamp((c.elevation - lowest) / 4.4, 0, 1);
    // Mountains are the high end of the same continuous elevation field as hills;
    // there is no separate stepped "mountain object" in the world.
    c.mountain = c.slope > 0.42 || c.elevation > 22;
    c.rocky = c.mountain;
    c.substrate = c.rocky ? "bedrock" : c.lakeBasin ? "clay" : c.slope > 0.22 ? "colluvium" : "loam";
    c.soilDepth = clamp(0.82 - c.slope * 0.65 - Math.max(0, c.elevation - 10) * 0.022 + valleyDepth(c.x, c.z) * 0.055 + (c.lakeBasin ? 0.2 : 0), 0.04, 1);
    c.accumulation = 1;
  }
  const order = cells.map((_, i) => i).sort((a, b) => cells[b].elevation - cells[a].elevation);
  for (const i of order) { const c = cells[i]; if (c.flowTo >= 0) cells[c.flowTo].accumulation += c.accumulation; }
  // Trace mountain springs through the already-computed downhill links.  This
  // must live here, after flowTo exists and while indexAt is in scope.
  const headwaterPaths = new Set();
  for (const source of terrainProfile?.headwaters || []) {
    let current = indexAt(Math.round(source.x), Math.round(source.z));
    const visited = new Set();
    for (let step = 0; step < 220 && current >= 0 && !visited.has(current); step++) {
      visited.add(current);
      const c = cells[current];
      headwaterPaths.add(current);
      if (c.lakeBasin || c.accumulation > 1800 || c.flowTo < 0) break;
      current = c.flowTo;
    }
  }
  const areaScale = Math.max(0.01, (WORLD / 304) ** 2), waterScale = Math.max(0.2, Math.max(worldSetup.rivers ?? 1, worldSetup.lakes ?? 1));
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    c.headwater = headwaterPaths.has(i);
    c.drainage = clamp(Math.log1p(c.accumulation) / 8, 0, 1);
    // This is shallow groundwater, not drinkable puddles.  It moderates drought
    // and supplies springs/baseflow without allowing animals to drink from grass.
    c.groundwater = clamp(0.06 + c.soilDepth * 0.17 + c.drainage * 0.12 + (c.lakeBasin ? 0.16 : 0), 0.04, 0.48);
    // Headwater channels are allowed over bedrock; steep rocky streams are an
    // important part of a mountain catchment.
    c.waterChannel = c.headwater || c.accumulation > Math.max(4, 320 * areaScale / waterScale);
    c.riverClass = c.accumulation > Math.max(18, 4400 * areaScale / waterScale) ? "river" : c.accumulation > Math.max(8, 1250 * areaScale / waterScale) ? "stream" : c.headwater ? "mountain stream" : c.waterChannel ? "creek" : "none";
    c.lakeLevel = lakeLevelAt(c.x, c.z);
    c.permanentWater = c.lakeLevel !== null || (c.basin && c.accumulation > Math.max(10, 1050 * areaScale / waterScale)) || c.accumulation > Math.max(15, 3600 * areaScale / waterScale);
    c.waterLevel = c.lakeLevel !== null ? 0.9 : c.permanentWater ? 0.82 : c.waterChannel ? Math.max(c.headwater ? 0.5 : 0, clamp((Math.log1p(c.accumulation) - 5.65) * 0.34, 0, 0.7)) : 0;
    c.water = c.lakeLevel !== null || c.waterLevel > 0.38;
    c.drinkable = Boolean(c.lakeLevel !== null || (c.water && c.waterChannel));
    c.sandy = false;
  }
  for (const c of cells) {
    let channelDistance = Infinity;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const x = c.x + dx, z = c.z + dz; if (x < -HALF || x >= HALF || z < -HALF || z >= HALF) continue; if (cells[indexAt(x, z)].waterChannel) channelDistance = Math.min(channelDistance, Math.hypot(dx, dz)); }
    c.channelDistance = channelDistance;
    const lakeEdge = lakeInfluence(c.x, c.z);
    c.lakeShore = !c.water && lakeEdge > 0.4 && lakeEdge < 0.6;
    c.riparian = !c.water && (channelDistance <= 2.25 || c.lakeShore) && c.slope < 0.3;
    c.floodplain = !c.water && channelDistance <= 3.1 && c.accumulation > 520 && c.slope < 0.16 && c.soilDepth > 0.35;
    c.sandy = !c.water && ((lakeEdge > 0.4 && lakeEdge < 0.48 && c.slope < 0.22) || (channelDistance <= 1.45 && c.slope < 0.15 && c.accumulation < 2800));
    c.wetland = !c.water && ((lakeEdge >= 0.48 && lakeEdge < 0.6 && c.moisture > 0.52) || (c.floodplain && c.slope < 0.09)) && !c.sandy && c.soilDepth > 0.32;
    if (c.wetland) { c.substrate = "peat"; c.moisture = 0.78; }
    else if (c.sandy) c.substrate = "sand";
    else if (c.floodplain) c.substrate = "alluvium";
  }
  return { order, model: "terrain-drainage-v1" };
}

function makeAnimal(id, speciesId, sex, pos, rng, age = 0, motherId = null) {
  const s = species[speciesId];
  const lifeStage = stageForAge(s, age, motherId);
  const body = bodyScale(s, age);
  const sizeTrait = 0.78 + rng() * 0.48;
  const bodyCondition = 0.92 + rng() * 0.14;
  const aggression = clamp(0.18 + rng() * 0.68 + (speciesId === "hunter" ? 0.08 : 0), 0, 1), scentSkill = 0.7 + rng() * 0.6, waterSkill = 0.7 + rng() * 0.6, foodSkill = 0.7 + rng() * 0.6, mateSkill = 0.7 + rng() * 0.6, careAffinity = clamp(1 - aggression * 0.45 + (rng() - 0.5) * 0.28, 0.2, 1.1);
  const matePreferences = sex === "F" ? { minHealth: 62 + rng() * 25, preferredMass: s.adultMass * (0.82 + rng() * 0.42), massTolerance: s.adultMass * (0.2 + rng() * 0.18), preferredAge: s.matureAge * (1.2 + rng() * 1.15), ageTolerance: s.matureAge * (0.5 + rng() * 0.65), preferredAggression: 0.18 + rng() * 0.68, aggressionTolerance: 0.18 + rng() * 0.25 } : null;
  return { id, speciesId, sex, x: pos.x, z: pos.z, fx: pos.x, fz: pos.z, orientation: rng() * Math.PI * 2, stationaryTicks: 0, age, lifeStage, sizeTrait, bodyCondition, bodyMass: s.adultMass * body * sizeTrait * bodyCondition, aggression, scentSkill, waterSkill, foodSkill, mateSkill, careAffinity, health: 100, healthCap: 100, energy: 86 + rng() * 18, hydration: 82 + rng() * 16, stomach: 35, seedLoad: [], fatigue: 0, fear: 0, injuries: [], tempStress: 0, capabilities: {}, sensoryBuffer: [], receivedSignals: [], threatEvidence: null, socialSignal: null, signalCooldownUntil: 0, groupAlert: null, alive: true, pregnant: null, courtship: null, lactation: 0, postpartum: 0, cycleOffset: rng() * (speciesId === "grazer" ? 28 : 36), matePreferences, mateHistory: [], motherId, dependentUntil: motherId ? age + s.dependency : 0, offspringIds: [], offspringMemory: {}, memories: [], longMemory: [], explored: {}, mapMemory: {}, communicationReveals: [], relationships: [], currentAction: "orienting", actionTarget: null, drive: "explore", timeline: [`born day ${Math.max(1, Math.floor(age))}`] };
}

function tickWorld() {
  // Preserve what is currently on screen before the authoritative tick mutates
  // organism transforms.  The completed tick is then presented continuously
  // over the following tick interval instead of appearing in one frame.
  const presentationStarted = performance.now();
  const presentationStarts = new Map();
  for (const animal of sim.animals) if (animal.alive) presentationStarts.set(animal.id, visualState(animal, presentationStarted));
  perf.ticks += 1;
  sim.tick += 1;
  enforceWorldBoundary();
  if (sim.tick % 24 === 0) sim.day += 1;
  profiler.measure("weather/hydrology", () => {
    updateWeather();
    if (sim.tick % 24 === 0) beginWaterCycle();
    advanceWaterCycle();
  });
  if (sim.tick % 3 === 0) updateScentFields(3);
  profiler.measure("vegetation simulation", growPlants);
  // Ecological cover evolves continuously, but rebuilding a 304×304 visual map
  // every few simulation steps is needless and was the cause of visible stutter.
  if (sim.tick % 240 === 0) landscapeDirty = true;
  profiler.measure("corpse processing", decayCorpses);
  sim.occupied = new Map(sim.animals.filter((a) => a.alive).map((a) => [key(a), a.id]));
  buildEntityIndex();
  for (const animal of sim.animals) if (animal.alive) updateAnimal(animal);
  beginAnimalPresentation(presentationStarts, performance.now());
  if (sim.tick % 24 === 0) updateSocialGroups();
  updateGroupAlerts();
  sim.animals = sim.animals.filter((a) => a.alive || sim.tick - (a.deathTick || sim.tick) < 8);
  // At slow speeds the display updates every simulation step, so organisms never
  // appear to teleport. Faster modes still throttle heavy overlay/UI rebuilds.
  const displayEvery = Math.max(1, Math.ceil(requestedTicksPerSecond() / 3));
  if (sim.tick % displayEvery === 0) { renderAll(); updateUI(); }
  // Keep a resumable browser snapshot without making every display update write
  // a large 304×304 world to storage.
  if (sim.tick - lastAutosaveTick >= 120) { lastAutosaveTick = sim.tick; saveProgress(true); }
}

function updateWeather() {
  const season = seasons[Math.floor(((sim.day - 1) % 120) / 30)];
  sim.season = season;
  if (!sim.weatherSystems?.length) sim.weatherSystems = createWeatherSystems();
  for (const w of sim.weatherSystems) { w.x += w.vx; w.z += w.vz; if (w.x > HALF + w.radius) w.x = -HALF - w.radius; if (w.z > HALF + w.radius) w.z = -HALF - w.radius; if (w.z < -HALF - w.radius) w.z = HALF + w.radius; }
  const centre = regionalWeatherAt({ x: 0, z: 0 });
  sim.weather = { type: centre.stormFactor > .72 && centre.wind > .88 ? "Hurricane-force storm" : centre.stormFactor > .42 ? "Severe cyclonic storm" : centre.rain > .62 ? "Regional rain" : centre.rain > .12 ? "Passing front" : centre.pressure > .35 ? "High pressure" : "Broken cloud", temp: centre.temp, rain: centre.rain, wind: centre.wind, stormFactor: centre.stormFactor };
  if (!sim.weatherField || sim.tick % 12 === 0) refreshWeatherField();
}

function refreshWeatherField() {
  const step = 16, width = Math.ceil(WORLD / step), values = [];
  for (let gz = 0; gz < width; gz++) for (let gx = 0; gx < width; gx++) values.push(regionalWeatherAt({ x: -HALF + gx * step + step / 2, z: -HALF + gz * step + step / 2 }));
  sim.weatherField = { step, width, values };
}

function cachedWeatherAt(cell) {
  const field = sim.weatherField;
  if (!field) return regionalWeatherAt(cell);
  const gx = clamp(Math.floor((cell.x + HALF) / field.step), 0, field.width - 1), gz = clamp(Math.floor((cell.z + HALF) / field.step), 0, field.width - 1);
  return field.values[gz * field.width + gx];
}

function windDirectionVector(direction = worldSetup.windDirection) { return ({ west: [1, 0], southwest: [.707, -.707], south: [0, -1], southeast: [-.707, -.707], east: [-1, 0] }[direction] || [1, 0]); }
function createWeatherSystems() { const [dx, dz] = windDirectionVector(), strength = worldSetup.windStrength ?? 1; return [{ kind: "low", x: -HALF * .72, z: -HALF * .28, radius: 72, moisture: .9, temp: -3, vx: dx * .22 * strength, vz: dz * .22 * strength }, { kind: "low", x: HALF * .15, z: HALF * .62, radius: 54, moisture: .7, temp: -1, vx: dx * .16 * strength, vz: dz * .16 * strength }, { kind: "high", x: HALF * .48, z: 0, radius: 86, moisture: -.7, temp: 4, vx: dx * .045 * strength, vz: dz * .045 * strength }]; }

function regionalWeatherAt(p) { if (sim?.hexWorld) { const c = sim.hexWorld.lookup(p.x, p.z), seasonal = sim.season === "Winter" ? -7 : sim.season === "Summer" ? 6 : sim.season === "Autumn" ? -2 : 1, [wx, wz] = windDirectionVector(), strength = worldSetup.windStrength ?? 1, shadow = worldSetup.rainShadow ?? 1; const upwind = c.neighbours.slice().sort((a, b) => ((a.x - c.x) * wx + (a.z - c.z) * wz) - ((b.x - c.x) * wx + (b.z - c.z) * wz))[0], downwind = c.neighbours.slice().sort((a, b) => ((b.x - c.x) * wx + (b.z - c.z) * wz) - ((a.x - c.x) * wx + (a.z - c.z) * wz))[0]; const uplift = Math.max(0, c.elevation - (upwind?.elevation ?? c.elevation)) / Math.max(1, sim.hexWorld.radius), lee = Math.max(0, c.elevation - (downwind?.elevation ?? c.elevation)) / Math.max(1, sim.hexWorld.radius); let low = 0, high = 0; for (const system of sim.weatherSystems || []) { const influence = Math.exp(-((p.x - system.x) ** 2 + (p.z - system.z) ** 2) / Math.max(1, system.radius * system.radius)); if (system.kind === "low") low += influence * system.moisture; else high += influence * Math.abs(system.moisture); } const temp = c.temperature + seasonal, stormFactor = clamp(low * c.humidity * clamp((temp - 20) / 13, 0, 1) * (worldSetup.stormIntensity ?? 1), 0, 1), rain = clamp((c.humidity * .38 + uplift * .28 * shadow + low * .27 + stormFactor * .42 - lee * .15 * shadow) * (worldSetup.rainfall ?? 1), 0, 1), wind = clamp(.10 + strength * (.16 + c.slope * .26 + (c.windChannel || 0) * .26 + low * .16 + stormFactor * .48), .04, 1); return { temp, rain, pressure: high * .32 - low * .28 - rain * .2, wind, stormFactor }; } const latitude = clamp((p.z + HALF) / WORLD, 0, 1), mod = seasonMods[sim.season] || seasonMods.Spring; return { temp: mod.temp - latitude * 8, rain: 0, pressure: 0, wind: .2, stormFactor: 0 }; }

function createTerrainProfile(seed) {
  const rng = mulberry32(seed ^ 0x51f15e);
  const mountains = [], peaks = [], hills = [], valleys = [], lakes = [], headwaters = [];
  const layout = WORLD / 304, extent = Math.max(10, HALF * 0.82), reliefSetting = worldSetup.relief;
  const mountainScale = worldSetup.mountains ?? 1, hillScale = worldSetup.hills ?? 1, valleyScale = worldSetup.valleys ?? 1, riverScale = worldSetup.rivers ?? 1, lakeScale = worldSetup.lakes ?? 1;
  // A reset can now generate a broad prairie as well as a mountainous country.
  // The seed determines both the layout and the overall relief character.
  // “High” relief or mountain settings must be authoritative. Randomness can
  // choose a prairie only when the user has actually asked for low relief.
  const flatCountry = reliefSetting < 0.9 && mountainScale < 0.75 && rng() < 0.28;
  const relief = (flatCountry ? 0.32 + rng() * 0.24 : 0.72 + rng() * 0.48) * reliefSetting;
  const rangeCount = mountainScale <= 0 ? 0 : Math.max(0, Math.round((flatCountry ? (rng() < 0.58 ? 0 : 1) : 1 + Math.floor(rng() * 3)) * mountainScale));
  for (let i = 0; i < rangeCount; i++) {
    const angle = rng() * Math.PI, x = -extent + rng() * extent * 2, z = -extent + rng() * extent * 2;
    // Most real mountain country is made of broad massifs and short ranges,
    // not needle-thin walls. Keep only a small minority as true long ridges.
    const ridge = rng() < 0.24;
    const width = ridge ? (13 + rng() * 13) * layout : (24 + rng() * 26) * layout;
    const length = ridge ? (60 + rng() * 54) * layout : (width * (1.05 + rng() * 0.75));
    const range = { x, z, angle, length: Math.max(7, length), width: Math.max(4.5, width), height: (ridge ? 19 + rng() * 18 : 15 + rng() * 18) * relief * mountainScale, shape: ridge ? "ridge" : "massif", windward: rng() > 0.5 ? 1 : -1 };
    mountains.push(range);
    for (let p = 0; p < (ridge ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2)); p++) { const along = (rng() - 0.5) * range.length * 0.58, side = (rng() - 0.5) * range.width * 0.42; const cx = Math.cos(angle), sz = Math.sin(angle); peaks.push({ x: x + cx * along - sz * side, z: z + sz * along + cx * side, levels: 5 + Math.floor(rng() * 4) }); }
    // Only broad ranges can hold an alpine tarn. Narrow ridges instead supply
    // springs that descend their natural drainage path.
    const cx = Math.cos(angle), sz = Math.sin(angle);
    if (range.width >= 19 && rng() < 0.62) {
      const along = (rng() - 0.5) * range.length * 0.36, side = (rng() - 0.5) * range.width * 0.22;
      const lx = clamp(x + cx * along - sz * side, -HALF + 2, HALF - 2), lz = clamp(z + sz * along + cx * side, -HALF + 2, HALF - 2);
      lakes.push({ x: lx, z: lz, rx: Math.max(1.5, (4 + rng() * 5) * layout), rz: Math.max(1.5, (3 + rng() * 4.5) * layout), depth: (1.4 + rng() * 2.2) * relief, kind: "alpine" });
      const flank = rng() < 0.5 ? -1 : 1, rim = Math.max(5, Math.max(4 + rng() * 5, 3 + rng() * 4.5) + 2);
      headwaters.push({ x: clamp(lx - sz * rim * flank, -HALF + 1, HALF - 1), z: clamp(lz + cx * rim * flank, -HALF + 1, HALF - 1), source: "alpine lake outlet" });
    } else {
      const along = (rng() - 0.5) * range.length * 0.4;
      headwaters.push({ x: clamp(x + cx * along, -HALF + 1, HALF - 1), z: clamp(z + sz * along, -HALF + 1, HALF - 1), source: "spring" });
    }
  }
  for (let i = 0, count = Math.round((flatCountry ? 1 + Math.floor(rng() * 2) : 3 + Math.floor(rng() * 3)) * hillScale); i < count; i++) hills.push({ x: -extent + rng() * extent * 2, z: -extent + rng() * extent * 2, radius: Math.max(3, (20 + rng() * 38) * layout), height: (4 + rng() * 10) * relief * hillScale });
  // Valleys remain distinct without cutting the map into implausibly deep trenches.
  for (let i = 0, count = Math.round((flatCountry ? Math.floor(rng() * 2) : 1 + Math.floor(rng() * 3)) * valleyScale); i < count; i++) valleys.push({ x: -extent + rng() * extent * 2, z: -extent + rng() * extent * 2, angle: rng() * Math.PI, length: Math.max(8, (55 + rng() * 75) * layout), width: Math.max(2.5, (13 + rng() * 18) * layout), depth: (3.5 + rng() * 5.5) * relief * valleyScale });
  const lakeCount = lakeScale <= 0 ? 0 : Math.max(1, Math.round((valleys.length ? (flatCountry ? 3 + rng() * 3 : 3 + rng() * 4) : 2 + rng() * 3) * lakeScale));
  for (let i = 0; i < lakeCount; i++) {
    const valley = valleys.length ? valleys[i % valleys.length] : { x: -extent + rng() * extent * 2, z: -extent + rng() * extent * 2, length: 48 * layout, width: 22 * layout };
    const scale = rng();
    lakes.push({ x: clamp(valley.x + (rng() - 0.5) * valley.length * 0.58, -HALF + 2, HALF - 2), z: clamp(valley.z + (rng() - 0.5) * valley.width * 1.55, -HALF + 2, HALF - 2), rx: Math.max(1.5, (5 + scale * 25) * layout), rz: Math.max(1.5, (4 + Math.pow(rng(), 0.72) * 20) * layout), depth: (2.2 + rng() * 5.4) * relief, kind: scale > 0.72 ? "lake" : "pond" });
  }
  if (riverScale === 0) headwaters.length = 0; else if (riverScale < 1) headwaters.splice(Math.max(1, Math.round(headwaters.length * riverScale))); else for (let i = 1; i < Math.round(riverScale); i++) if (mountains.length) { const m = mountains[i % mountains.length]; headwaters.push({ x: Math.round(m.x), z: Math.round(m.z), source: "extra spring" }); }
  const profile = { seed, mountains, peaks, hills, valleys, lakes, headwaters, relief, flatCountry, windAngle: rng() * Math.PI * 2, phaseA: rng() * 6.28, phaseB: rng() * 6.28 };
  for (const lake of lakes) { lake.surface = dryLandElevation(lake.x, lake.z, profile) - lake.depth * 0.5; lake.level = lake.surface; }
  return profile;
}
function rotatedDistance(x, z, feature) { const dx = x - feature.x, dz = z - feature.z, c = Math.cos(feature.angle || 0), s = Math.sin(feature.angle || 0); return { along: dx * c + dz * s, across: -dx * s + dz * c }; }
function ridgeAt(x, z, r) { const d = rotatedDistance(x, z, r); return r.height * Math.exp(-Math.pow(d.across / r.width, 2) * 2.4) * Math.exp(-Math.pow(d.along / r.length, 4) * 2.2); }
function hillAt(x, z, hx, hz, radius, height) { const d = Math.hypot(x - hx, z - hz) / radius; return height * Math.exp(-d * d * 1.7); }
function valleyDepth(x, z) { return (terrainProfile?.valleys || []).reduce((sum, v) => { const d = rotatedDistance(x, z, v); return sum + v.depth * Math.exp(-Math.pow(d.across / v.width, 2) * 2) * Math.exp(-Math.pow(d.along / v.length, 4) * 1.5); }, 0); }
function lakeInfluence(x, z) { return (terrainProfile?.lakes || []).reduce((best, l) => Math.max(best, Math.exp(-((x - l.x) ** 2 / (l.rx * l.rx) + (z - l.z) ** 2 / (l.rz * l.rz)))), 0); }
function mountainTier(x, z) { let tier = 0; for (const p of terrainProfile?.peaks || []) tier = Math.max(tier, Math.max(0, p.levels - Math.floor(Math.max(Math.abs(x - p.x), Math.abs(z - p.z)) / 3.2))); return tier; }
function woodlandValue(x, z) { const p = terrainProfile || { phaseA: 0, phaseB: 0 }; return Math.sin(x * 0.034 + p.phaseA) + Math.cos(z * 0.027 - p.phaseB) + Math.sin((x - z) * 0.016 + p.phaseA); }
function dryLandElevation(x, z, p = terrainProfile || { mountains: [], hills: [], phaseA: 0, phaseB: 0 }) { const broad = (Math.sin(x * 0.018 + p.phaseA) * 3.6 + Math.cos(z * 0.014 - p.phaseB) * 2.8 + Math.sin((x + z) * 0.009) * 1.8) * (p.relief ?? 1); const hills = p.hills.reduce((sum, h) => sum + hillAt(x, z, h.x, h.z, h.radius, h.height), 0); const ranges = p.mountains.reduce((sum, m) => sum + ridgeAt(x, z, m), 0); return broad + hills + ranges - (p.valleys || []).reduce((sum, v) => { const d = rotatedDistance(x, z, v); return sum + v.depth * Math.exp(-Math.pow(d.across / v.width, 2) * 2) * Math.exp(-Math.pow(d.along / v.length, 4) * 1.5); }, 0); }
function baseElevation(x, z) { const p = terrainProfile || { lakes: [] }; const lakes = (p.lakes || []).reduce((sum, l) => sum + l.depth * Math.exp(-((x - l.x) ** 2 / (l.rx * l.rx) + (z - l.z) ** 2 / (l.rz * l.rz))), 0); return dryLandElevation(x, z, p) - lakes; }
function terrainHeight(x, z) { return sim?.hexWorld?.lookup(x, z)?.elevation ?? 0; }
function lakeLevelAt(x, z) {
  const physical = sim?.hexWorld?.lookup(x, z);
  if (physical?.water && physical.waterBodyId?.startsWith("lake-")) return physical.waterSurface;
  let level = null, best = Infinity;
  for (const lake of terrainProfile?.lakes || []) {
    const basin = (x - lake.x) ** 2 / (lake.rx * lake.rx) + (z - lake.z) ** 2 / (lake.rz * lake.rz);
    const surface = lake.level ?? lake.surface;
    if (basin <= 1 && terrainHeight(x, z) <= surface + 0.025 && basin < best) { best = basin; level = surface; }
  }
  return level;
}
function lakeSurfaceHeight(x, z) {
  // Prefer the actual simulated lake level when a cell has already been
  // classified as lake water. This keeps every rendered lake horizontal even
  // at its irregular shoreline.
  const c = cellAt(clamp(Math.round(x), -HALF, HALF - 1), clamp(Math.round(z), -HALF, HALF - 1));
  return c?.lakeLevel ?? lakeLevelAt(x, z) ?? terrainHeight(x, z) + 0.12;
}

function localTemperatureAt(p) {
  return regionalWeatherAt(p).temp;
}

function beginWaterCycle() {
  if (sim.hexWorld) { sim.hexWorld.update(sim.day, sim.season, sim.weather); sim.water = sim.hexWorld.cells.filter((c) => c.water).map((c) => c.id); buildTerrain(); landscapeDirty = true; return; }
  // The fixed drainage map is still evaluated once per simulated day, but its
  // 92k cells are spread across ticks so the browser never has one large frame.
  // A lake changes one horizontal water level, rather than raising individual
  // tiles. Rain raises it; heat and wind lower it; its edge then finds all land
  // whose terrain lies below that level.
  for (const lake of terrainProfile?.lakes || []) {
    const weather = regionalWeatherAt(lake);
    const catchmentGain = Math.min(0.11, (lake.catchmentRunoff || 0) * 0.018);
    const snowmeltGain = Math.min(0.05, (lake.snowmeltInflow || 0) * 0.028);
    const rainGain = weather.temp < 0 ? 0.004 : weather.rain * 0.036 + catchmentGain + snowmeltGain;
    const evaporation = Math.max(0, weather.temp - 5) * (0.003 + weather.wind * 0.0015);
    lake.level = clamp((lake.level ?? lake.surface) + rainGain - evaporation, lake.surface - 0.65, lake.surface + 0.8);
    lake.catchmentRunoff = 0;
    lake.snowmeltInflow = 0;
  }
  sim.hydrologyJob = { incoming: new Float32Array(sim.cells.length), cursor: 0, phase: "flow", water: [] };
}

function advanceWaterCycle(budget = 23000) {
  if (sim.hexWorld) return;
  const job = sim.hydrologyJob;
  if (!job) return;
  if (job.phase === "flow") {
    const end = Math.min(sim.hydrology.order.length, job.cursor + budget);
    for (let orderIndex = job.cursor; orderIndex < end; orderIndex++) {
      const i = sim.hydrology.order[orderIndex];
    const c = sim.cells[i], local = cachedWeatherAt(c);
    const alpine = c.elevation > 12 || c.mountain;
    const snowfall = local.temp < (alpine ? 2 : 0) ? local.rain * (alpine ? 0.09 : 0.05) : 0;
    c.snowPack = clamp((c.snowPack || 0) + snowfall - (local.temp > 1 ? local.temp * (alpine ? 0.0022 : 0.004) : 0), 0, 1);
    const melt = local.temp > 0 ? Math.min(c.snowPack, local.temp * (alpine ? 0.0035 : 0.006)) : 0;
    c.snowPack -= melt;
    const rain = local.temp < 0 ? 0 : local.rain * 0.055;
    const springRelease = c.groundwater * (c.headwater ? 0.028 : c.waterChannel ? 0.014 : 0.003);
    c.groundwater = clamp(c.groundwater - springRelease, 0, 0.8);
    const available = job.incoming[i] + rain + melt + springRelease + (c.surfaceWater || 0) * 0.18;
    const capacity = 0.008 + c.soilDepth * 0.038;
    const infiltrated = Math.min(available, capacity * (1.15 - c.moisture * 0.7));
    c.groundwater = clamp(c.groundwater + infiltrated * 0.52 - Math.max(0, local.temp - 22) * 0.0005, 0, 0.8);
    c.moisture = clamp(c.moisture + infiltrated * 2.8 + Math.min(0.012, c.groundwater * 0.025) - Math.max(0.002, (local.temp - 4) * 0.0018) - (c.woodland ? 0.003 : 0.001), 0, 1);
    const runoff = Math.max(0, available - infiltrated) * (0.42 + c.slope * 0.44);
    c.surfaceWater = clamp(available - runoff, 0, c.basin ? 2.2 : 0.18);
    if (c.flowTo >= 0) job.incoming[c.flowTo] += runoff;
    else if (c.basin) c.surfaceWater = clamp(c.surfaceWater + runoff, 0, 2.2);
    c.streamFlow = runoff + job.incoming[i] * 0.45;
    if (c.lakeBasin && terrainProfile?.lakes?.length) {
      let closest = terrainProfile.lakes[0], best = Infinity;
      for (const lake of terrainProfile.lakes) { const d = (c.x - lake.x) ** 2 + (c.z - lake.z) ** 2; if (d < best) { best = d; closest = lake; } }
      closest.catchmentRunoff = (closest.catchmentRunoff || 0) + runoff;
      closest.snowmeltInflow = (closest.snowmeltInflow || 0) + melt;
    }
  }
    job.cursor = end;
    if (job.cursor < sim.hydrology.order.length) return;
    job.phase = "surface"; job.cursor = 0;
  }
  const end = Math.min(sim.cells.length, job.cursor + budget);
  for (let i = job.cursor; i < end; i++) {
    const c = sim.cells[i];
    const local = cachedWeatherAt(c);
    const baseflow = c.headwater ? 0.14 : c.accumulation > 2500 ? 0.22 : c.accumulation > 900 ? 0.08 : 0;
    c.lakeLevel = lakeLevelAt(c.x, c.z);
    c.waterLevel = c.lakeLevel !== null ? 0.9 : c.basin ? clamp(c.surfaceWater * 1.2 + (c.permanentWater ? 0.48 : 0), 0, 1) : c.waterChannel ? clamp(baseflow + c.streamFlow * 5.5, 0, 1) : 0;
    c.water = c.lakeLevel !== null || c.waterLevel > 0.38;
    // Wet ground may be visible, but only an actual channel or lake is a source to drink from.
    c.drinkable = Boolean(c.lakeLevel !== null || (c.water && c.waterChannel));
    const lakeEdge = lakeInfluence(c.x, c.z);
    c.sandy = !c.water && ((lakeEdge > 0.4 && lakeEdge < 0.48 && c.slope < 0.22) || (c.channelDistance <= 1.45 && c.slope < 0.15 && c.accumulation < 2800));
    c.wetland = !c.water && ((lakeEdge >= 0.48 && lakeEdge < 0.6 && c.moisture > 0.52) || (c.floodplain && c.moisture > 0.6 && c.slope < 0.09)) && !c.sandy;
    if (c.water) { c.moisture = 1; c.biomass = 0; c.woodland = false; }
    c.terrainClass = landClass(c, local.temp);
    if (c.water) job.water.push(key(c));
  }
  job.cursor = end;
  if (job.cursor < sim.cells.length) return;
  sim.water = job.water;
  for (const a of sim.animals) if (a.alive && cellAt(a.x, a.z).water) displaceFromWater(a);
  sim.hydrologyJob = null;
  // Water levels alter terrain-face heights/materials, so rebuild the shared
  // terrain surface only after the complete daily hydrology pass finishes.
  clear(groups.terrain);
  buildTerrain();
  landscapeDirty = true;
}

function displaceFromWater(a) {
  const dry = neighbors(a).filter((p) => inside(p.x, p.z) && !cellAt(p.x, p.z).water && !sim.occupied?.has(key(p)));
  const destination = dry.sort((p, q) => terrainHeight(p.x, p.z) - terrainHeight(q.x, q.z))[0];
  if (destination) { applyMove(a, destination, "leaving newly flooded ground"); a.fatigue += 3; return; }
  a.health -= 3; a.currentAction = "stranded by rising water";
}

function growPlants() {
  const mod = seasonMods[sim.season];
  const cadence = 32;
  for (let i = sim.tick % cadence; i < sim.cells.length; i += cadence) {
    const cell = sim.cells[i];
    if (cell.water || cell.rocky || cell.sandy || cell.wetland) { cell.biomass = 0; cell.terrainClass = landClass(cell, cachedWeatherAt(cell).temp); continue; }
    const type = plantTypes[cell.plantType];
    const local = cachedWeatherAt(cell), localTemp = local.temp;
    // A fallen trunk is retained as cover for six simulated months (180 days),
    // then decomposes into the local ground cover instead of teleporting away.
    if (cell.leaflessTreeUntil && sim.tick >= cell.leaflessTreeUntil && !cell.fallenTreeUntil) {
      // A dead standing tree remains as bare cover for three months, then
      // falls and persists as deadwood for a further three to nine months.
      cell.leaflessTreeUntil = 0;
      cell.fallenTreeUntil = sim.tick + 24 * (90 + Math.floor(rand() * 181));
      cell.plantStage = "fallen";
    }
    if (cell.fallenTreeUntil && sim.tick >= cell.fallenTreeUntil) {
      cell.fallenTreeUntil = 0;
      cell.woodland = false;
      cell.plantType = "grass";
      cell.woodyStage = "none";
      cell.biomass = Math.min(cell.biomass, 0.16);
      cell.plantAge = 0;
    }
    cell.plantAge = (cell.plantAge || 0) + cadence / 24;
    cell.vegetationAgeDays = cell.plantAge;
    // A cell is revisited every 16 simulation hours. The former loss rate was
    // accidentally scaled as if every cell were updated every hour, stripping
    // the whole grassland bare within a few days of dry weather.
    cell.moisture = clamp(cell.moisture - Math.max(0, localTemp - 25) * 0.0004 * cadence, 0, 1);
    const droughtStress = cell.moisture < 0.25 ? (0.25 - cell.moisture) * 0.045 * cadence : 0;
    const winterStress = localTemp < -2 ? 0.006 * cadence : 0;
    cell.dormant = localTemp < 0 || cell.moisture < 0.16;
    if (cell.biomass <= 0.03 || cell.plantAge > 260 + rand() * 220) {
      cell.biomass = Math.max(0, cell.biomass - 0.025 * cadence);
      cell.plantStage = cell.biomass <= 0.01 ? "dead" : "senescent";
      if (cell.biomass <= 0.01 && rand() < 0.02) reseedCell(cell);
      continue;
    }
    const climateGrowth = clamp(1 - Math.abs(localTemp - 17) / 26, 0.08, 1);
    const growth = cell.dormant ? 0 : type.growth * mod.growth * climateGrowth * cell.fertility * (0.35 + cell.moisture) * cadence;
    cell.grazingPressure = Math.max(0, (cell.grazingPressure || 0) * 0.89 - 0.002 * cadence);
    if (cell.plantType === "tree") cell.moisture = clamp(cell.moisture - 0.0018 * cadence, 0, 1);
    else if (cell.plantType === "shrub") cell.moisture = clamp(cell.moisture - 0.00075 * cadence, 0, 1);
    cell.biomass = clamp(cell.biomass + growth - droughtStress - winterStress, 0, type.max);
    cell.grassHeight = cell.woodland ? 0 : clamp(cell.biomass * (0.36 + cell.moisture * 0.64) - (cell.grazingPressure || 0) * 0.45, 0, 1);
    if (cell.biomass > type.max * 0.75 && cell.plantAge > 12) {
      cell.seedStore = (cell.seedStore || 0) + (type.seedRate || 0.004) * mod.growth * cadence;
      if (cell.seedStore > 1 && rand() < (type.seedRate || 0.004)) disperseSeed(cell);
    }
    cell.plantStage = plantStageFor(cell);
    // Woody succession is deliberately slow.  It is evaluated once per
    // ecological month per hex, never as a daily forest reshuffle.
    const woodlandSetting = worldSetup.woodland ?? 1;
    const ecologicalMonth = (sim.day + cell.id) % 30 === 0;
    if (ecologicalMonth && !cell.woodland && !cell.shrubland && woodlandSetting > 0 && !cell.sandy && !cell.wetland && cell.moisture > .48 && cell.soilDepth > .42 && cell.slope < .22 && cell.plantAge > 120 && rand() < 0.015 * (worldSetup.bushes ?? 1)) { cell.shrubland = true; cell.plantType = "shrub"; cell.woodyStage = "shrub"; cell.biomass = Math.max(cell.biomass, 0.28); }
    if (ecologicalMonth && cell.shrubland && !cell.woodland && cell.moisture > .58 && cell.soilDepth > .58 && cell.plantAge > 540 && rand() < 0.04 * woodlandSetting) { cell.shrubland = false; cell.woodland = true; cell.plantType = "shrub"; cell.woodyStage = "shrub"; }
    if (ecologicalMonth && cell.woodland && cell.plantType === "shrub" && cell.moisture > 0.63 && cell.soilDepth > 0.64 && cell.plantAge > 720 && rand() < 0.05) {
      cell.plantType = "tree";
      cell.woodyStage = "youngTree";
    }
    if (cell.plantType === "tree" && cell.woodyStage === "youngTree" && cell.plantAge > 720) cell.woodyStage = "matureTree";
    // Tree death is staged: a leafless standing tree first, then a persistent
    // fallen trunk.  It never makes a tree teleport to another hex.
    if (cell.plantType === "tree" && !cell.leaflessTreeUntil && !cell.fallenTreeUntil && local.wind > 0.78 && cell.moisture < 0.42 && rand() < 0.00035) {
      cell.leaflessTreeUntil = sim.tick + 24 * 90;
      cell.plantStage = "leafless";
    }
    if (ecologicalMonth && !cell.leaflessTreeUntil && !cell.fallenTreeUntil && (cell.woodland || cell.shrubland) && ((cell.plantType === "tree" && cell.moisture < 0.34) || cell.soilDepth < 0.3) && rand() < 0.08) { cell.woodland = false; cell.shrubland = cell.moisture > 0.42; cell.plantType = cell.shrubland ? "shrub" : "grass"; cell.woodyStage = cell.shrubland ? "shrub" : "none"; }
    cell.grassBiomass = cell.plantType === "grass" ? cell.biomass : 0;
    cell.shrubBiomass = cell.plantType === "shrub" ? cell.biomass : 0;
    cell.vegetationStage = cell.woodland && cell.woodyStage === "matureTree" ? "matureForest" : cell.woodland ? "youngWoodland" : cell.shrubland ? "scrub" : cell.biomass > .12 ? "grass" : "bare";
    cell.terrainClass = landClass(cell, localTemp);
  }
}

function landClass(c, temp = cachedWeatherAt(c).temp) {
  if (c.water) return c.waterLevel > 0.72 ? "deepWater" : "shallowWater";
  if ((c.snowPack || 0) > 0.12 || (temp < -2 && c.elevation > 1.5)) return "snow";
  if (c.rocky) return "rock";
  if (c.wetland) return "wetland";
  if (c.floodplain && c.moisture > 0.58) return "mud";
  if (c.sandy) return "sand";
  if (c.woodland) return "forest";
  if (c.shrubland) return "shrubland";
  if (temp > 28 && (c.ecoMoisture ?? c.moisture) < .42) return "dirt";
  if (temp > 22 && (c.ecoMoisture ?? c.moisture) < .58) return "dryGrass";
  if ((c.grassHeight || 0) > 0.68) return "longGrass";
  return c.biomass > 0.12 ? "grass" : "dirt";
}

function updateAnimal(a) {
  const s = species[a.speciesId];
  a.age += 1 / 24;
  a.postpartum = Math.max(0, (a.postpartum || 0) - 1 / 24);
  a.lactation = Math.max(0, (a.lactation || 0) - 1 / 24);
  a.lifeStage = stageForAge(s, a.age, a.motherId);
  a.bodyCondition = clamp((a.bodyCondition ?? 1) + (a.stomach > 70 && a.energy > 70 ? 0.0018 : a.stomach < 24 || a.energy < 25 ? -0.0032 : -0.00035), 0.58, 1.18);
  a.bodyMass = s.adultMass * bodyScale(s, a.age) * (a.sizeTrait || 1) * a.bodyCondition;
  a.capabilities = computeCapabilities(a, s);
  const localWeather = regionalWeatherAt(a);
  a.energy -= s.hungerRate * stageCost(a) * weatherCost(a);
  a.hydration -= s.thirstRate * (localWeather.temp > 20 ? 1.25 : 1);
  if (localWeather.rain > 0.35) a.hydration = clamp(a.hydration + 0.08, 0, 100);
  a.fatigue = clamp(a.fatigue - 2.2, 0, 100);
  a.movementNoise = Math.max(0, (a.movementNoise || 0) * 0.52);
  a.fear = clamp(a.fear - (5 + safeCoverFor(a) * 7), 0, 100);
  updateTrauma(a);
  ageDecline(a, s);
  updateInjuries(a);
  refreshOutwardSignal(a);
  const before = { energy: a.energy, hydration: a.hydration, health: a.health, x: a.x, z: a.z, fx: a.fx ?? a.x, fz: a.fz ?? a.z };
  profiler.measure("animal perception", () => sense(a));
  refreshOutwardSignal(a);
  profiler.measure("decision/action", () => chooseAndAct(a));
  a.stationaryTicks = Math.hypot((a.fx ?? a.x) - before.fx, (a.fz ?? a.z) - before.fz) < 0.01 ? (a.stationaryTicks || 0) + 1 : 0;
  profiler.measure("causal trace capture", () => recordCausalLoop(a, before));
  updatePregnancy(a, s);
  processDigestion(a);
  if (a.stomach < 8) { a.health -= 0.11; a.energy -= 0.08; }
  if (a.energy <= 0) { a.energy = 0; a.health -= 0.32; }
  if (a.health <= 0 && (a.stomach < 8 || a.energy <= 0)) die(a, "starvation");
  else if (a.hydration <= 0) die(a, "dehydration");
  else if (a.health <= 0) die(a, "injury");
  else if (a.age > s.maxAge + rand() * 40) die(a, "old age");
}

function sense(a) {
  const s = species[a.speciesId];
  const scale = a.capabilities?.perceptionScale || 1;
  const visionRange = visionRangeFor(a);
  const smellRange = Math.max(2, Math.round(s.smell * (a.lifeStage === "dependent" ? 0.55 : 1) * scale));
  // Hearing is deliberately kept out of this cell scan: sound reaches far, but
  // it does not reveal every terrain cell inside its radius.
  const range = Math.max(visionRange, smellRange);
  a.explored ||= {};
  a.mapMemory ||= {};
  a.longMemory ||= [];
  a.communicationReveals = (a.communicationReveals || []).filter((r) => r.until > sim.tick);
  // Exploration is made by sight, not by an invisible circular scan. This keeps
  // the persistent map distinct from smell and hearing.
  for (const c of nearbyCells(a, visionRange)) if (hasMapVision(a, c, visionRange)) {
    const mapKey = exploreKey(c);
    a.explored[mapKey] = sim.tick;
    // An explored cell is remembered only as neutral ground unless water was
    // actually seen. This prevents the map view from leaking hidden ecology.
    // A remembered water source is deliberately coarse.  The organism retains
    // an approximate place to travel to, not every blue terrain cell that makes
    // up a river or lake.
    if (c.drinkable) {
      const sourceKey = `water:${Math.round(c.x / 6)},${Math.round(c.z / 6)}`;
      a.mapMemory[sourceKey] = { type: "water", x: Math.round(c.x / 6) * 6, z: Math.round(c.z / 6) * 6, seenTick: sim.tick, confidence: 1 };
    }
  }
  const contacts = [];
  const hearingRange = hearingRangeFor(a);
  for (const other of nearbyAnimals(a, Math.max(visionRange, hearingRange) + 1)) {
    if (!other.alive || other.id === a.id) continue;
    const d = dist(a, other);
    const viewQuality = animalVisibilityQuality(a, other, visionRange);
    if (canSeeAnimal(a, other, visionRange) && rand() > 0.1 + d / (visionRange * 5.8) + sim.weather.wind * 0.08 + (1 - viewQuality) * 0.55) {
      const type = a.speciesId === "grazer" && other.speciesId === "hunter" ? "predator" : other.speciesId === a.speciesId ? "conspecific" : "animal";
      contacts.push({ type, targetId: other.id, speciesId: other.speciesId, x: other.x, z: other.z, confidence: clamp(1 - d / (visionRange + 1), 0.15, 1), age: 0, channel: "sight" });
      // This is not ordinary fading observation memory. A parent retains the
      // last place it actually saw each dependent until it can re-establish
      // contact or learn a newer place through that child's call.
      if (a.offspringIds?.includes(other.id)) {
        a.offspringMemory ||= {};
        a.offspringMemory[other.id] = { ...(a.offspringMemory[other.id] || {}), x: other.x, z: other.z, tick: sim.tick, confidence: 1, source: "sight" };
      }
      if (other.socialSignal?.until > sim.tick && other.speciesId === a.speciesId) contacts.push({ type: ["alarm", "threat"].includes(other.socialSignal.kind) ? "predator" : `signal:${other.socialSignal.kind}`, targetId: other.id, x: other.socialSignal.x, z: other.socialSignal.z, confidence: clamp(1 - d / (visionRange + 1), 0.2, 1), age: 0, channel: "visual-signal", signalKind: other.socialSignal.kind, communicatedBy: other.id });
    }
    const call = animalCall(other);
    const movementNoise = other.movementNoise || 0;
    const audibleRange = hearingRange * (call ? 1 : clamp(0.18 + movementNoise * 1.15, 0, 1));
    if (d <= audibleRange && (call || movementNoise > 0.045)) {
      // Accuracy has a distance half-life: it halves every half-range.  A
      // motionless listener concentrates on the source after two ticks.
      const precision = hearingAccuracyFor(a, d, hearingRange);
      const positionError = (1 - precision) * (2 + hearingRange * 0.16);
      const heardX = clamp(Math.round(other.x + (rand() - 0.5) * positionError), -HALF, HALF - 1);
      const heardZ = clamp(Math.round(other.z + (rand() - 0.5) * positionError), -HALF, HALF - 1);
      const identifiesCaller = precision >= 0.58;
      const understandsCall = identifiesCaller && other.speciesId === a.speciesId && call;
      if (understandsCall) {
        const messageX = clamp(Math.round(call.x + (rand() - 0.5) * (1 - precision) * 6), -HALF, HALF - 1), messageZ = clamp(Math.round(call.z + (rand() - 0.5) * (1 - precision) * 6), -HALF, HALF - 1);
        const message = { type: call.noun, x: messageX, z: messageZ, confidence: precision * 0.82, age: 0, channel: "hearing", communicatedBy: other.id, signalKind: call.signalKind, urgency: call.urgency };
        contacts.push(message);
        if (a.offspringIds?.includes(other.id)) { a.offspringMemory ||= {}; a.offspringMemory[other.id] = { ...(a.offspringMemory[other.id] || {}), x: messageX, z: messageZ, tick: sim.tick, confidence: message.confidence, source: "call" }; }
        a.communicationReveals.push({ x: messageX, z: messageZ, until: sim.tick + 14, sourceId: other.id, noun: call.noun });
      } else contacts.push({ type: "unknownSound", ...(identifiesCaller ? { targetId: other.id, speciesId: other.speciesId, soundIdentity: other.speciesId } : { soundIdentity: "unknown" }), x: heardX, z: heardZ, confidence: precision * 0.65, age: 0, channel: "hearing" });
      a.communicationReveals.push({ x: heardX, z: heardZ, until: sim.tick + 8, sourceId: other.id });
    }
  }
  for (const cell of nearbyCells(a, range)) {
    const d = manhattan(a, cell);
    if (hasVisualLine(a, cell, visionRange) && cell.drinkable && rand() > d / (visionRange + 3)) contacts.push({ type: "water", x: cell.x, z: cell.z, confidence: 0.92, age: 0, channel: "sight" });
    if (hasVisualLine(a, cell, visionRange) && !cell.water && (!cell.woodland || cell.plantType === "shrub") && cell.biomass > 0.28 && a.speciesId === "grazer" && rand() > d / (visionRange + 3)) contacts.push({ type: "food", plantType: cell.plantType, quality: plantQuality(cell), x: cell.x, z: cell.z, confidence: clamp(cell.biomass, 0.15, 1), age: 0, channel: "sight" });
    const scentType = a.speciesId === "hunter" ? "grazer" : "hunter";
    // Scent has no line-of-sight requirement, but it must still obey the
    // animal's actual smell range. Previously it quietly inherited vision
    // range, giving some animals a false long-distance scent radar.
    if (d <= smellRange && cell.scent && cell.scent[scentType] > 0.6 && rand() > d / (smellRange + 4)) contacts.push({ type: scentType === "hunter" ? "predator" : "preyTrail", x: cell.x, z: cell.z, confidence: clamp(cell.scent[scentType] / 5, 0.15, 1), age: 0, channel: "smell" });
  }
  for (const corpse of sim.corpses) {
    if (corpse.biomass <= 0) continue;
    const d = dist(a, corpse), smellRange = s.smell * scale * 3 * (a.scentSkill || 1) * (1.1 + Math.min(1.6, corpse.biomass / 18));
    if (hasVisualLine(a, corpse, visionRange)) contacts.push({ type: "carcass", targetId: corpse.id, x: corpse.x, z: corpse.z, confidence: clamp(1 - d / (visionRange + 1), 0.2, 1), age: 0, channel: "sight" });
    else if (d <= smellRange) { const certainty = clamp(Math.pow(0.5, d / Math.max(1, smellRange * 0.34)), 0.08, 0.9), error = Math.round((1 - certainty) * 13); contacts.push({ type: "carcass", targetId: corpse.id, x: clamp(Math.round(corpse.x + (rand() - 0.5) * error), -HALF, HALF - 1), z: clamp(Math.round(corpse.z + (rand() - 0.5) * error), -HALF, HALF - 1), confidence: certainty, age: 0, channel: "smell" }); }
  }
  a.sensoryBuffer = contacts;
  a.receivedSignals = contacts.filter((m) => m.signalKind || m.channel === "visual-signal").slice(-12);
  const prioritised = attentionFilter(a, contacts);
  updateThreatEvidence(a, contacts);
  const memoryRetention = a.speciesId === "hunter" ? 0.972 : 0.94;
  const memoryLimit = a.speciesId === "hunter" ? 300 : 150;
  a.memories.forEach((m) => { m.age += 1; m.confidence *= memoryRetention; });
  for (const m of prioritised) remember(a, m);
  a.memories = a.memories.filter((m) => m.age < memoryLimit && m.confidence > 0.1).slice(-(a.speciesId === "hunter" ? 140 : 80));
  a.longMemory.forEach((m) => { m.age += 1; m.confidence *= 0.9992; });
  a.longMemory = a.longMemory.filter((m) => m.age < 2400 && m.confidence > 0.15).slice(-12);
}

function socialSignalLabel(kind) { return ({ threat: "predator sighting", attacked: "physical attack", care: "dependent care request", alarm: "legacy threat alarm", distress: "distress cry", injury: "injury signal", water: "water request", hunger: "hunger signal", lost: "contact call", courtship: "courtship call" })[kind] || "no signal"; }
function socialSignalMeaning(kind) { return ({ threat: "A predator was seen, heard, or scented. The sender is scanning or fleeing; this is not proof it was struck.", attacked: "The sender was physically struck moments ago. Parents and nearby allies treat this as an emergency defence / rescue signal.", care: "A dependent animal needs a caregiver; it is not necessarily under attack.", alarm: "Legacy saved-world threat alarm; treated as a predator sighting.", distress: "Injured, overwhelmed, or urgently seeking help.", injury: "Health is impaired; nearby allies may respond.", water: "Critically thirsty; asking same-species animals for water help.", hunger: "Critical hunger, usually visual rather than a loud call.", lost: "Separated from group or caregiver.", courtship: "Seeking or responding to a mate." })[kind] || "no current world symbol"; }
function huntDecisionExplanation(a) {
  if (a.speciesId !== "hunter") return "";
  if (a.stomach >= 72) return "Too full to hunt.";
  if (a.fatigue > 88 || a.energy < 12) return "Recovering; hunt deferred.";
  if ((a.sensoryBuffer || []).some((m) => m.type === "animal" && m.channel === "sight")) return "Prey visible — evaluating or pursuing.";
  if (nearestMemory(a, "preyTrail")) return "No prey in view — following a scent trail.";
  if (nearestMemory(a, "carcass")) return "Known carcass overrides a live hunt.";
  return "Prey outside vision — searching or listening.";
}
function socialSignalIcon(kind) { return ({ threat: "!", attacked: "✹", care: "♥", alarm: "!", distress: "!", injury: "+", water: "W", hunger: "F", lost: "?", courtship: "♥" })[kind] || "•"; }
function socialSignalColour(kind) { return ({ threat: "#ffcf4f", attacked: "#ff4854", care: "#ff94c2", alarm: "#ffcf4f", distress: "#ff8754", injury: "#ff8754", water: "#5ab9ff", hunger: "#f3cd52", lost: "#d7ecff", courtship: "#ff72ab" })[kind] || "#ffffff"; }
function socialStatusCandidate(a) {
  const threat = a.threatEvidence?.score || 0;
  const caregiverVisible = (a.sensoryBuffer || []).some((m) => m.channel === "sight" && (m.targetId === a.motherId || (a.caregiverIds || []).includes(m.targetId)));
  const infantNeed = a.lifeStage === "dependent" && (a.energy < 52 || a.hydration < 52 || a.fear > 48 || !caregiverVisible);
  if ((a.lastHit?.tick ?? -999) >= sim.tick - 18) return { kind: "attacked", urgency: 100, x: a.x, z: a.z, attackerId: a.lastHit.attackerId };
  if (threat >= 52) return { kind: "threat", urgency: Math.round(threat), x: a.threatEvidence?.x ?? a.x, z: a.threatEvidence?.z ?? a.z };
  if (infantNeed) return { kind: "care", urgency: caregiverVisible ? 88 : 96, x: a.x, z: a.z };
  if (a.health < 46 || (a.injuries || []).length > 1) return { kind: "injury", urgency: Math.round(100 - a.health), x: a.x, z: a.z };
  if (a.hydration < 35) return { kind: "water", urgency: Math.round(100 - a.hydration), x: a.x, z: a.z };
  if (Math.max(100 - a.energy, (68 - a.stomach) * 1.65) > 70) return { kind: "hunger", urgency: Math.round(Math.max(100 - a.energy, (68 - a.stomach) * 1.65)), x: a.x, z: a.z };
  if (a.lifeStage !== "dependent" && !a.groupId && (a.stationaryTicks || 0) > 8) return { kind: "lost", urgency: 35, x: a.x, z: a.z };
  if ((a.courtshipUntil || 0) > sim.tick || a.drive === "reproduction") return { kind: "courtship", urgency: 28, x: a.x, z: a.z };
  return null;
}
function shouldStartCall(a, signal) {
  if (sim.tick < (a.vocalCooldownUntil || 0)) return false;
  // Adults normally communicate through posture and expression. Young animals
  // call much more readily when they need a caregiver; alarms remain rare,
  // brief emergency calls rather than an always-on beacon.
  if (a.lifeStage === "dependent" && signal.kind === "care") return true;
  if (signal.kind === "attacked") return rand() < (a.lifeStage === "dependent" ? 0.92 : 0.62);
  if (signal.kind === "threat" || signal.kind === "alarm") return signal.urgency > 72 && rand() < (a.lifeStage === "dependent" ? 0.8 : 0.34);
  if (signal.kind === "injury" || signal.kind === "distress") return a.lifeStage === "dependent" ? rand() < 0.55 : rand() < 0.12;
  if (signal.kind === "lost") return a.lifeStage === "dependent" && rand() < 0.45;
  if (signal.kind === "courtship") return mature(a) && rand() < 0.08;
  return false;
}
function refreshOutwardSignal(a) {
  const next = socialStatusCandidate(a), active = a.socialSignal;
  if (!next) { if (active?.until <= sim.tick) a.socialSignal = null; return; }
  const changed = !active || active.kind !== next.kind || next.urgency > active.urgency + 15;
  if (changed || active.until <= sim.tick) {
    a.socialSignal = { ...next, sourceId: a.id, since: sim.tick, until: sim.tick + (["threat", "attacked", "care"].includes(next.kind) ? 16 : 11) };
    if (changed && sim.tick >= (a.signalCooldownUntil || 0)) {
      a.signalCooldownUntil = sim.tick + 12;
      addEvent(`${a.id}: ${socialSignalLabel(next.kind)}`);
    }
    if (shouldStartCall(a, next)) {
      a.vocalUntil = sim.tick + (a.lifeStage === "dependent" ? 3 : 1);
      a.vocalCooldownUntil = sim.tick + (a.lifeStage === "dependent" ? 6 : 12);
    }
  } else a.socialSignal = { ...active, ...next, until: Math.max(active.until, sim.tick + 5) };
}
function updateThreatEvidence(a, contacts) {
  if (a.speciesId !== "grazer") { a.threatEvidence = null; return; }
  const predatorEvidence = contacts.filter((m) => m.type === "predator");
  const sight = predatorEvidence.filter((m) => m.channel === "sight" || m.channel === "visual-signal");
  const sound = predatorEvidence.filter((m) => m.channel === "hearing");
  const smell = predatorEvidence.filter((m) => m.channel === "smell");
  const unknownNear = contacts.filter((m) => m.type === "unknownSound" && m.channel === "hearing" && m.confidence > 0.28);
  const score = clamp(sight.reduce((n, m) => n + m.confidence * 62, 0) + sound.reduce((n, m) => n + m.confidence * 31, 0) + smell.reduce((n, m) => n + m.confidence * 20, 0) + unknownNear.reduce((n, m) => n + m.confidence * 12, 0), 0, 100);
  const strongest = [...sight, ...sound, ...smell, ...unknownNear].sort((p, q) => q.confidence - p.confidence)[0];
  const parts = []; if (sight.length) parts.push(`${sight.length} predator sighting${sight.length > 1 ? "s" : ""}`); if (sound.length) parts.push(`${sound.length} alarm call${sound.length > 1 ? "s" : ""}`); if (smell.length) parts.push("predator scent"); if (!parts.length && unknownNear.length) parts.push("unknown large-animal sound");
  a.threatEvidence = { score, x: strongest?.x ?? a.x, z: strongest?.z ?? a.z, sourceId: strongest?.targetId, channel: strongest?.channel, explanation: parts.length ? parts.join(" + ") : "no predator evidence" };
  if (score > 0) a.fear = clamp(a.fear + Math.max(3, score * 0.5) + vulnerability(a) * 8, 0, 100);
}
function animalCall(a) { const stalking = a.speciesId === "hunter" && /stalk|pursu|track/.test(a.currentAction || ""); const signal = a.socialSignal; if (!stalking && (a.vocalUntil || 0) > sim.tick && signal && signal.until > sim.tick) return { noun: ["threat", "alarm"].includes(signal.kind) ? "predator" : signal.kind, x: signal.x, z: signal.z, signalKind: signal.kind, urgency: signal.urgency }; return null; }
function audibleActivity(a) { return Boolean(animalCall(a)) || (a.movementNoise || 0) > 0.045; }

function attentionFilter(a, contacts) {
  const drives = driveLevels(a);
  return contacts.sort((m1, m2) => contactSalience(a, m2, drives) - contactSalience(a, m1, drives)).slice(0, 16);
}

function contactSalience(a, m, drives) {
  let score = m.confidence * 20;
  if (m.type === "predator") score += drives.fear + 30;
  if (m.type === "food") score += drives.hunger;
  if (m.type === "water") score += drives.thirst;
  if (m.type === "animal" && a.speciesId === "hunter") score += drives.hunger * 0.7;
  if (m.targetId && a.offspringIds.includes(m.targetId)) score += 45;
  return score;
}

function chooseAndAct(a) {
  if (a.lifeStage === "dependent") { a.priorities = [{ drive: "dependency", score: 100 }]; return dependentAction(a); }
  if ((a.courtshipUntil || 0) > sim.tick) { a.priorities = [{ drive: "courtship", score: 100 }]; a.currentAction = `courtship (${a.courtshipUntil - sim.tick} steps remaining)`; return; }
  a.actionTarget = null;
  const candidates = actionCandidates(a);
  candidates.sort((x, y) => y.score - x.score);
  a.priorities = candidates.map(({ drive, score }) => ({ drive, score: Math.round(score) }));
  const chosen = candidates[0];
  a.drive = chosen.drive;
  chosen.run();
}

function actionCandidates(a) {
  const d = driveLevels(a);
  const c = a.capabilities || computeCapabilities(a, species[a.speciesId]);
  const candidates = [];
  const threat = a.threatEvidence?.score || 0;
  if (a.speciesId === "grazer" && threat >= 46) candidates.push({ drive: "threat response", score: 330 + threat * 2, run: () => flee(a) });
  const missingChild = missingDependentNeed(a);
  if (missingChild) candidates.push({ drive: "safeguard missing offspring", score: missingChild.emergency ? 920 : 520, run: () => searchForOffspring(a, missingChild) });
  const exhaustion = Math.max(0, a.fatigue - 34);
  const canRecoverFuel = a.stomach > 20 && a.hydration > 28;
  const restScore = (exhaustion * 2.15 + (a.fatigue > 76 ? 64 : 0) + (a.health < 50 ? 42 : 0) + (a.energy < 32 && canRecoverFuel ? (32 - a.energy) * 2.2 : 0)) * (a.hydration < 18 || a.stomach < 10 ? 0.3 : 1);
  candidates.push({ drive: "rest", score: restScore, run: () => rest(a, a.fatigue > 72 ? "sleeping to recover" : "resting to recover") });
  if (a.stomach > 68) candidates.push({ drive: "digest", score: 38 + (a.stomach - 68) * 2.2, run: () => rest(a, "resting to digest") });
  if (d.thirst > 18) candidates.push({ drive: "water", score: d.thirst * (d.thirst > 65 ? 2.35 : 1.35) + (nearWater(a, 1) ? Math.min(24, d.thirst * 0.45) : 0) + memorySupport(a, "water") * 8, run: () => nearWater(a, 1) ? drink(a) : seekWater(a) });
  if (a.fear > 28) candidates.push({ drive: "fear", score: d.fear * 1.7 + vulnerability(a) * 25 + threat, run: () => flee(a) });
  if (a.speciesId === "grazer" && d.hunger > 12) candidates.push({ drive: "hunger", score: d.hunger * 1.25 + localFoodBonus(a) + memorySupport(a, "food") * 16 - d.fear * 0.45, run: () => localFoodBonus(a) > 12 ? graze(a) : moveToMemory(a, "food", "foraging", graze) });
  if (a.speciesId === "grazer" && (a.fear > 18 || (a.sensoryBuffer || []).some((m) => m.type === "predator"))) {
    const herd = visibleHerd(a);
    if (herd.length >= 2) candidates.push({ drive: "herd safety", score: 58 + d.fear * 1.45 + herd.length * 11, run: () => seekHerdSafety(a, herd) });
  }
  if (a.speciesId === "hunter" && (canEat(a) || carcassFamilyUrgency(a) > 0) && (knownCarcass(a) || nearestMemory(a, "carcass"))) candidates.push({ drive: "scavenge", score: 320 + d.hunger * 2.4 + carcassFamilyUrgency(a), run: () => scavenge(a) });
  if (a.speciesId === "hunter" && c.canHunt) candidates.push({ drive: "hunt", score: d.hunger * 1.65 + memorySupport(a, "animal") * 24 + memorySupport(a, "preyTrail") * 14 + localPreyScentBonus(a) - d.fatigue * 0.35, run: () => hunt(a) });
  if (a.groupAlert?.until > sim.tick) {
    const alert = a.groupAlert;
    candidates.push({ drive: `group alert: ${alert.goal}`, score: 180 + alert.score, run: () => {
      if (alert.goal.includes("flee")) flee(a);
      else if (alert.goal === "water") seekWater(a);
      else if (alert.goal === "caregiving") attendOffspring(a);
      else if (alert.goal === "defend / rescue") { if (attackedOffspringSignal(a)) protectOffspring(a); else { const source = animalById(alert.source); source?.alive ? moveToward(a, source, `responding to ${source.id}'s attack signal`) : socialWander(a, "responding to attack signal"); } }
      else socialWander(a, `responding to group ${alert.goal}`);
    } });
  }
  const leader = a.groupLeaderId ? animalById(a.groupLeaderId) : null;
  if (leader?.alive && leader.id !== a.id && ["water", "foraging", "mates", "protection", "caregiving", "carcass hunt", "hunting"].includes(a.groupGoal)) candidates.push({ drive: `group ${a.groupGoal}`, score: groupFollowScore(a, d), run: () => followGroupLeader(a, leader) });
  if (c.canMate) candidates.push({ drive: "reproduction", score: d.reproduction + sensedMateBonus(a), run: () => seekMate(a) });
  if (a.speciesId === "grazer" && (threatenedOffspring(a) || attackedOffspringSignal(a))) candidates.push({ drive: "protect offspring", score: attackedOffspringSignal(a) ? 720 : 260 + species[a.speciesId].maternalCare * 38, run: () => protectOffspring(a) });
  if (knownOffspringContact(a) && manhattan(a, knownOffspringContact(a)) > 3) candidates.push({ drive: "parental", score: 74 + species[a.speciesId].maternalCare * 30, run: () => attendOffspring(a) });
  candidates.push({ drive: "explore", score: 18 + rand() * 10 + species[a.speciesId].herdTendency * herdBonus(a), run: () => socialWander(a) });
  return candidates.map((cnd) => ({ ...cnd, score: cnd.score + rand() * 9 }));
}

function driveLevels(a) {
  return { hunger: clamp(Math.max(100 - a.energy, (68 - a.stomach) * 1.65), 0, 100), thirst: clamp(100 - a.hydration, 0, 100), fear: a.fear, fatigue: a.fatigue, reproduction: reproductionDrive(a) };
}

function feedingState(a) { const s = a.stomach; return s < 8 ? "starving" : s < 22 ? "very hungry" : s < 38 ? "hungry" : s < 52 ? "mildly hungry" : s < 68 ? "satiated" : s < 82 ? "full" : s < 94 ? "stuffed" : "over-stuffed"; }
function canEat(a) { return a.stomach < 72 && sim.tick - (a.lastMealTick ?? -999) >= 2; }

function dependentAction(a) {
  const contact = (a.sensoryBuffer || []).find((m) => m.channel === "sight" && (m.targetId === a.motherId || (a.caregiverIds || []).includes(m.targetId)));
  const caregiver = contact ? animalById(contact.targetId) : null;
  const mother = caregiver?.id === a.motherId ? caregiver : null;
  if (!caregiver) { if (a.age > a.dependentUntil) return becomeIndependent(a, "without a caregiver"); const memory = (a.memories || []).find((m) => m.targetId === a.motherId || (a.caregiverIds || []).includes(m.targetId)); if (memory) return moveToward(a, memory, "following remembered caregiver location"); a.energy -= 1.6; a.currentAction = "calling for a dependable adult"; return; }
  if (dist(a, caregiver) > 1.5) moveToward(a, caregiver, `following caregiver ${caregiver.id}`);
  else { const knowsFood = caregiver.memories.some((m) => m.age < 40 && (m.type === "food" || m.type === "animal" || m.type === "preyTrail")); const knowsWater = caregiver.memories.some((m) => m.age < 40 && m.type === "water"); if (mother?.lactation > 0 || knowsFood) a.energy = clamp(a.energy + (mother ? 1.2 : 0.55), 0, 100); if (mother?.lactation > 0 || knowsWater) a.hydration = clamp(a.hydration + (mother ? 0.8 : 0.4), 0, 100); a.stomach = clamp(a.stomach + (mother?.lactation > 0 ? 0.7 : knowsFood ? 0.3 : 0), 0, 68); a.currentAction = mother?.lactation > 0 ? "nursing from mother" : `depending on ${caregiver.id}'s resource knowledge`; }
  if (sim.weather.type === "Cold" && a.age < 4) a.health -= 0.04;
  if (a.age > a.dependentUntil && a.energy > 55) becomeIndependent(a);
}

function becomeIndependent(a, suffix = "") { const oldMother = a.motherId; a.motherId = null; a.caregiverIds = []; a.lifeStage = "juvenile"; const mother = animalById(oldMother); if (mother?.offspringMemory?.[a.id]) mother.offspringMemory[a.id].dependent = false; removeRelationship(a.id, oldMother, "dependency"); a.timeline.push(`independent day ${sim.day}`); addEvent(`${a.id} became independent${suffix ? ` ${suffix}` : ""}`); }

function updateSocialGroups() { const alive = sim.animals.filter((a) => a.alive); for (const a of alive) { const nearby = nearbyAnimals(a, 6).filter((o) => o.id !== a.id && o.speciesId === a.speciesId && dist(a, o) <= 6 && socialCompatible(a, o)); if (nearby.length >= 1) { const members = [a, ...nearby]; const groupId = members.map((m) => m.groupId).find(Boolean) || `group-${a.speciesId}-${members.map((m) => m.id).sort()[0]}`; const goal = groupGoal(members); const leader = [...members].sort((p, q) => groupSkillFor(q, goal) - groupSkillFor(p, goal))[0]; members.forEach((m) => { m.groupId = groupId; m.groupGoal = goal; m.groupLeaderId = leader.id; }); } else if (a.lifeStage !== "dependent") { a.groupId = null; a.groupGoal = null; a.groupLeaderId = null; } if (a.lifeStage === "dependent") a.caregiverIds = nearby.filter((o) => mature(o) && (o.careAffinity || 0.5) > 0.55 && o.aggression < 0.72).sort((p, q) => (q.careAffinity || 0) - (p.careAffinity || 0)).slice(0, 3).map((o) => o.id); } }
function updateGroupAlerts() {
  const groupsById = new Map();
  for (const a of sim.animals) if (a.alive && a.groupId) { const list = groupsById.get(a.groupId) || []; list.push(a); groupsById.set(a.groupId, list); }
  for (const members of groupsById.values()) {
    const signals = members.flatMap((a) => a.receivedSignals || []).filter((s) => s.confidence > 0.24);
    const threat = Math.max(0, ...members.map((a) => a.threatEvidence?.score || 0));
    let goal = null, score = 0, source = null;
    if (signals.some((s) => s.signalKind === "attacked")) { goal = "defend / rescue"; score = 100; source = signals.find((s) => s.signalKind === "attacked")?.communicatedBy; }
    else if (threat >= 42 || signals.some((s) => ["alarm", "threat"].includes(s.signalKind) || s.type === "predator")) { goal = "flee / protection"; score = Math.max(threat, 72); source = members.find((a) => (a.threatEvidence?.score || 0) >= threat)?.id; }
    else if (signals.some((s) => s.signalKind === "care")) { goal = "caregiving"; score = 76; source = signals.find((s) => s.signalKind === "care")?.communicatedBy; }
    else if (signals.some((s) => s.signalKind === "water")) { goal = "water"; score = 55; source = signals.find((s) => s.signalKind === "water")?.communicatedBy; }
    else if (signals.some((s) => ["injury", "distress"].includes(s.signalKind))) { goal = "assist / protect"; score = 48; source = signals.find((s) => ["injury", "distress"].includes(s.signalKind))?.communicatedBy; }
    for (const a of members) {
      const old = a.groupAlert;
      a.groupAlert = goal ? { goal, score, source, until: sim.tick + 10 } : old?.until > sim.tick ? old : null;
    }
  }
}
function socialCompatible(a, b) { if (a.lifeStage === "dependent" || b.lifeStage === "dependent") return (a.careAffinity || 0.5) > 0.55 || (b.careAffinity || 0.5) > 0.55; if (a.speciesId === "hunter") return a.aggression > 0.3 || b.aggression > 0.3; return !(a.aggression > 0.86 && b.lifeStage === "juvenile") && !(b.aggression > 0.86 && a.lifeStage === "juvenile"); }
function groupGoal(members) { const young = members.some((m) => m.offspringIds?.some((id) => { const child = animalById(id); return child?.alive && child.energy < 55; })); const carcass = members.some((m) => (m.sensoryBuffer || []).some((x) => x.type === "carcass") || nearestMemory(m, "carcass")); const fear = Math.max(...members.map((m) => m.fear)); const thirst = Math.max(...members.map((m) => 100 - m.hydration)); const hunger = Math.max(...members.map((m) => 100 - m.energy)); if (young) return "caregiving"; if (carcass && members[0].speciesId === "hunter") return "carcass hunt"; if (fear > 32) return "protection"; if (thirst > 56) return "water"; if (hunger > 52) return members[0].speciesId === "hunter" ? "hunting" : "foraging"; if (members.some((m) => reproductionDrive(m) > 55)) return "mates"; return "travelling"; }
function groupSkillFor(a, goal) { if (goal === "carcass hunt" || goal === "hunting") return (a.scentSkill || 1) * 2 + a.aggression; if (goal === "caregiving" || goal === "protection") return (a.careAffinity || 0.5) * 2 + (1 - a.aggression); if (goal === "water") return a.waterSkill || 1; if (goal === "foraging") return a.foodSkill || 1; if (goal === "mates") return a.mateSkill || 1; return ((a.waterSkill || 1) + (a.foodSkill || 1)) / 2; }
function groupFollowScore(a, drives) { const alert = a.groupAlert?.until > sim.tick ? a.groupAlert : null; if (alert) return alert.score + (alert.goal.includes("flee") ? drives.fear * 1.6 : 0); const goal = a.groupGoal; if (goal === "carcass hunt") return 265 + drives.hunger * 1.7 + carcassFamilyUrgency(a); if (goal === "hunting") return 70 + drives.hunger; if (goal === "protection") return 92 + drives.fear * 1.4; if (goal === "caregiving") return 86 + carcassFamilyUrgency(a); if (goal === "water") return 48 + drives.thirst * 1.25; if (goal === "foraging") return 42 + drives.hunger; return 38 + drives.reproduction; }
function followGroupLeader(a, leader) { if (dist(a, leader) > 1.8) return moveToward(a, leader, `following ${leader.id} for ${a.groupGoal}`); a.currentAction = `coordinating ${a.groupGoal} group`; }

function attackedOffspringSignal(a) { return (a.receivedSignals || []).find((m) => m.signalKind === "attacked" && a.offspringIds.includes(m.targetId || m.communicatedBy)); }
function dependentSignal(a) { return (a.receivedSignals || []).find((m) => ["care", "attacked"].includes(m.signalKind) && a.offspringIds.includes(m.targetId || m.communicatedBy)); }
function knownOffspringContact(a) { return (a.sensoryBuffer || []).find((m) => a.offspringIds.includes(m.targetId) && m.channel === "sight") || attackedOffspringSignal(a) || dependentSignal(a) || (a.memories || []).find((m) => a.offspringIds.includes(m.targetId)); }
function missingDependentNeed(a) {
  const direct = (a.sensoryBuffer || []).some((m) => a.offspringIds.includes(m.targetId) && m.channel === "sight");
  if (direct) return null;
  const urgent = attackedOffspringSignal(a) || dependentSignal(a);
  const record = urgent || Object.entries(a.offspringMemory || {}).map(([id, m]) => ({ targetId: id, ...m })).filter((m) => m.dependent).sort((p, q) => q.tick - p.tick)[0];
  if (!record) return null;
  return { ...record, emergency: Boolean(urgent?.signalKind === "attacked"), lostFor: sim.tick - (record.tick || sim.tick) };
}
function searchForOffspring(a, target) {
  a.actionTarget = target.targetId || target.communicatedBy || null;
  if (dist(a, target) > 1.4) return moveToward(a, target, target.emergency ? "rushing to attacked offspring" : "searching for missing offspring");
  a.currentAction = target.emergency ? "guarding attacked offspring's last call" : "searching offspring's last known location";
  a.orientation += 0.52;
  a.stationaryTicks = (a.stationaryTicks || 0) + 1;
}
function attendOffspring(a) {
  const child = knownOffspringContact(a);
  if (!child) return rest(a);
  if (a.fear > 50) return moveToward(a, child, "returning to offspring under risk");
  moveToward(a, child, "leading dependent offspring");
}

function socialWander(a, label = "exploring") {
  const leader = a.groupLeaderId ? animalById(a.groupLeaderId) : null;
  if (leader?.alive && leader.id !== a.id && dist(a, leader) > 2.5) return moveToward(a, leader, `moving with ${a.groupGoal || "temporary"} group`);
  const herdMate = nearestConspecific(a);
  if (herdMate && species[a.speciesId].herdTendency > rand() && dist(a, herdMate) > 3) return moveToward(a, herdMate, "moving with group");
  wander(a, label);
}
function visibleHerd(a) { return (a.sensoryBuffer || []).filter((m) => m.type === "conspecific" && m.channel === "sight" && m.targetId).map((m) => animalById(m.targetId)).filter((other) => other?.alive && mature(other)); }
function seekHerdSafety(a, herd = visibleHerd(a)) { if (!herd.length) return flee(a); const centre = herd.reduce((sum, other) => ({ x: sum.x + other.x / herd.length, z: sum.z + other.z / herd.length }), { x: 0, z: 0 }); if (dist(a, centre) > 2) moveToward(a, centre, `joining herd safety (${herd.length} adults)`); else { a.fear = clamp(a.fear - Math.min(14, herd.length * 2), 0, 100); a.currentAction = `sheltering with herd (${herd.length} adults)`; } }
function hunt(a) {
  if (!a.hunt || !animalById(a.hunt.targetId)?.alive) {
    const target = chooseVisiblePrey(a);
    if (!target) return followPreyTrailOrWander(a);
    const contact = sightContactFor(a, target.id);
    a.hunt = { stage: "approach", targetId: target.id, started: sim.tick, lost: 0, lastKnown: { x: contact.x, z: contact.z, tick: sim.tick } };
    a.currentAction = "evaluating prey";
  }
  const target = animalById(a.hunt.targetId);
  if (!target || !target.alive) { a.hunt = null; return; }
  const sight = sightContactFor(a, target.id);
  if (sight) { a.hunt.lastKnown = { x: sight.x, z: sight.z, tick: sim.tick }; a.hunt.lost = 0; } else a.hunt.lost += 1;
  if (a.hunt.lost > 12 || a.fatigue > 94 || a.energy < 7) { a.currentAction = "abandoning hunt"; a.hunt = null; return rest(a); }
  // A hunter may pursue only a current sighting or its own last observed point;
  // it never receives a hidden herbivore's changing coordinates.
  const pursuitPoint = sight ? target : a.hunt.lastKnown;
  if (!sight) {
    if (dist(a, pursuitPoint) > 1) return moveToward(a, pursuitPoint, "tracking last seen prey position");
    a.currentAction = "searching where prey was last seen"; a.hunt = null; return followPreyTrailOrWander(a);
  }
  if (dist(a, target) > 4 && a.hunt.stage === "approach") return moveToward(a, target, "stalking prey");
  a.hunt.stage = "pursuit";
  if (dist(a, target) > 1) {
    a.fatigue += 2.8;
    moveToward(a, target, "pursuing prey");
    if (a.capabilities?.canSprint && dist(a, target) > 1 && rand() < 0.72) { a.energy -= 0.35; a.fatigue += 2.2; moveToward(a, target, "sprinting after prey"); }
    return;
  }
  const defenderList = sim.animals.filter((o) => o.alive && o.speciesId === "grazer" && mature(o) && dist(o, target) <= 2.2 && (o.offspringIds.includes(target.id) || target.lifeStage === "dependent" || o.id === target.id));
  const defenders = defenderList.length;
  const success = rand() < clamp(0.55 + vulnerability(target) * 0.28 - a.fatigue / 170 + (a.capabilities?.speed || 1) / 8 - defenders * 0.14, 0.04, 0.88);
  a.fatigue += 18;
  a.energy -= 8;
  if (success) {
    const damage = 18 + rand() * 18;
    strikeAnimal(a, target, damage, "bite");
    if (target.health <= 0) { die(target, `killed by ${a.id}`, a.id); a.currentAction = "claiming fresh kill"; a.hunt = null; }
    else { a.currentAction = `bit ${target.id} (${Math.round(damage)} health damage)`; if (defenderList.length && rand() < Math.min(0.82, 0.22 + defenderList.length * 0.16)) herbivoreCounterattack(defenderList[Math.floor(rand() * defenderList.length)], a); }
  } else { target.fear = 100; a.attackFlashUntil = sim.tick + 14; if (defenderList.length) herbivoreCounterattack(defenderList[Math.floor(rand() * defenderList.length)], a); else maybeInjure(a, 0.18, target.id, "defence"); if (!a.alive) return; maybeInjure(target, 0.12, a.id, "near miss"); a.currentAction = defenders ? "attack repelled by herd defence" : "failed attack"; if (a.fatigue > 75) a.hunt = null; }
}

function herbivoreCounterattack(defender, hunter) {
  // A grazer's horns/hooves can hurt a hunter, but each defence costs 30% more
  // energy than the hunter's standard 8-point attack effort.
  if (!defender?.alive || !hunter?.alive || defender.energy < 12) return;
  const hunterStrikeEquivalent = 18 + rand() * 18;
  const damage = hunterStrikeEquivalent * 0.10;
  defender.energy -= 10.4;
  defender.fatigue += 8;
  defender.currentAction = `defending against ${hunter.id}`;
  strikeAnimal(defender, hunter, damage, "horn/hoof defence");
  hunter.fear = clamp(hunter.fear + 24, 0, 100);
  if (hunter.health <= 0) die(hunter, `killed by ${defender.id}`, defender.id);
}

function chooseVisiblePrey(a) {
  const seenIds = new Set((a.sensoryBuffer || []).filter((m) => m.channel === "sight" && m.type === "animal" && m.confidence > 0.18).map((m) => m.targetId));
  const seen = sim.animals.filter((o) => o.alive && o.speciesId === "grazer" && seenIds.has(o.id)).sort((p, q) => targetScore(a, p) - targetScore(a, q))[0];
  if (seen) return seen;
  return undefined;
}

function sightContactFor(a, targetId) { return (a.sensoryBuffer || []).find((m) => m.targetId === targetId && m.channel === "sight" && m.confidence > 0.12); }

function followPreyTrailOrWander(a) {
  const trail = nearestMemory(a, "preyTrail");
  if (trail) return moveToward(a, trail, "tracking scent trail");
  socialWander(a, "searching for prey");
}

function seekMate(a) {
  const contact = (a.sensoryBuffer || []).find((m) => m.channel === "sight" && m.type === "conspecific" && m.targetId && eligibleMate(a, animalById(m.targetId)));
  const mate = contact ? animalById(contact.targetId) : null;
  if (!mate) { const memory = a.memories.find((m) => m.type === "conspecific" && m.targetId && eligibleMate(a, animalById(m.targetId))); return memory ? moveToward(a, memory, "following remembered mate location") : wander(a, "searching for mate"); }
  if (dist(a, mate) > 1) return moveToward(a, mate, "approaching mate");
  const female = a.sex === "F" ? a : mate;
  const male = female.id === a.id ? mate : a;
  if ((female.mateRejectUntil || 0) > sim.tick && female.rejectedMateId === male.id) {
    a.currentAction = `giving ${female.id} space after rejection`;
    return wander(a, a.currentAction);
  }
  if (!female.pregnant && !female.conception && female.energy > species[female.speciesId].reproductionEnergy) {
    const fatherId = male.id;
    // Females choose from an encountered mate: safety, condition and the male's condition
    // influence acceptance, so proximity alone never guarantees conception.
    const pref = female.matePreferences || { minHealth: 70, preferredMass: species[female.speciesId].adultMass, massTolerance: species[female.speciesId].adultMass * 0.3, preferredAge: species[female.speciesId].matureAge * 1.7, ageTolerance: species[female.speciesId].matureAge * 0.7, preferredAggression: 0.5, aggressionTolerance: 0.35 };
    const healthFit = clamp((male.health - pref.minHealth) / Math.max(1, 100 - pref.minHealth), 0, 1);
    const massFit = clamp(1 - Math.abs(male.bodyMass - pref.preferredMass) / pref.massTolerance, 0, 1);
    const ageFit = clamp(1 - Math.abs(male.age - pref.preferredAge) / pref.ageTolerance, 0, 1);
    const aggressionFit = clamp(1 - Math.abs((male.aggression ?? 0.5) - pref.preferredAggression) / pref.aggressionTolerance, 0, 1);
    const acceptance = clamp(0.06 + female.energy / 390 + female.health / 700 - female.fatigue / 300 - female.fear / 220 + healthFit * 0.23 + massFit * 0.16 + ageFit * 0.13 + aggressionFit * 0.15, 0.05, 0.92);
    if (rand() > acceptance) {
      female.mateRejectUntil = sim.tick + 36;
      female.rejectedMateId = male.id;
      female.currentAction = `rejecting courtship from ${male.id}`;
      male.currentAction = `rejected by ${female.id}`;
      addEvent(`${female.id} rejected courtship from ${male.id}`);
      return;
    }
    female.conception = { fatherId, completesAt: sim.tick + 6 };
    female.mateHistory ||= []; male.mateHistory ||= [];
    female.mateHistory.unshift({ partnerId: male.id, day: sim.day, tick: sim.tick, status: "courtship" });
    male.mateHistory.unshift({ partnerId: female.id, day: sim.day, tick: sim.tick, status: "courtship" });
    female.mateHistory = female.mateHistory.slice(0, 8); male.mateHistory = male.mateHistory.slice(0, 8);
    a.courtshipUntil = sim.tick + 6;
    mate.courtshipUntil = sim.tick + 6;
    // Visual feedback lingers after the short courtship action completes.
    a.courtshipIconUntil = sim.tick + 30;
    mate.courtshipIconUntil = sim.tick + 30;
    female.energy -= 10;
    addEvent(`${female.id} and ${fatherId} began courtship`);
  }
  a.currentAction = `courtship with ${mate.id}`;
  a.actionTarget = mate.id;
}

function fertilityCycle(a) { const period = a.speciesId === "grazer" ? 28 : 36, fertileDays = a.speciesId === "grazer" ? 6 : 7; const day = ((a.age + (a.cycleOffset || 0)) % period + period) % period; return { period, day, fertileDays, fertile: a.sex === "F" && mature(a) && !a.pregnant && !a.conception && a.postpartum <= 0 && day < fertileDays }; }
function eligibleMate(a, mate) { return Boolean(mate?.alive && mate.speciesId === a.speciesId && mate.sex !== a.sex && mature(mate) && !mate.pregnant && !mate.conception && (mate.sex !== "F" || fertilityCycle(mate).fertile) && (a.sex !== "F" || fertilityCycle(a).fertile)); }
function sensedMateBonus(a) { return (a.sensoryBuffer || []).some((m) => m.channel === "sight" && m.type === "conspecific" && eligibleMate(a, animalById(m.targetId))) ? 35 : 0; }
function threatenedOffspring(a) { const predators = (a.sensoryBuffer || []).filter((m) => m.type === "predator" && m.channel === "sight"); const children = (a.sensoryBuffer || []).filter((m) => a.offspringIds.includes(m.targetId) && m.channel === "sight"); return children.some((child) => predators.some((predator) => manhattan(child, predator) < 7)); }
function protectOffspring(a) { const childContact = knownOffspringContact(a); const childId = childContact?.targetId || childContact?.communicatedBy || "offspring"; const predatorContact = (a.sensoryBuffer || []).filter((m) => m.type === "predator" && m.channel === "sight").sort((p, q) => manhattan(p, childContact || a) - manhattan(q, childContact || a))[0]; if (!childContact) return rest(a, "guarding from remembered risk"); if (predatorContact && manhattan(predatorContact, childContact) < 3) { const predator = animalById(predatorContact.targetId); if (predator) { a.currentAction = `defending ${childId} from ${predator.id}`; a.actionTarget = predator.id; predator.fatigue += 4; if (rand() < 0.12) herbivoreCounterattack(a, predator); return; } } moveToward(a, childContact, `rushing to protect ${childId}`); }

function updatePregnancy(a, s) {
  if (a.conception && sim.tick >= a.conception.completesAt) { const fatherId = a.conception.fatherId; a.pregnant = { age: 0, fatherId, viability: 1 }; a.conception = null; const father = animalById(fatherId); for (const parent of [a, father]) { const record = parent?.mateHistory?.find((entry) => entry.partnerId === (parent.id === a.id ? fatherId : a.id) && entry.status === "courtship"); if (record) record.status = "conceived"; } addEvent(`${a.id} conceived with ${fatherId}`); }
  if (!a.pregnant) return;
  a.pregnant.age += 1 / 24;
  a.energy -= 0.45;
  if (a.energy < 28 || a.health < 45) a.pregnant.viability -= 0.02;
  if (a.pregnant.viability <= 0) { a.pregnant = null; addEvent(`${a.id} lost pregnancy`); return; }
  if (a.pregnant.age >= s.gestation) giveBirth(a, s);
}

function giveBirth(mother, s) {
  const count = Math.floor(s.litter[0] + rand() * (s.litter[1] - s.litter[0] + 1));
  for (let i = 0; i < count; i++) {
    const pos = nearestFree(mother);
    const id = `${mother.speciesId === "grazer" ? "H" : "C"}${sim.nextId++}`;
    const child = makeAnimal(id, mother.speciesId, rand() > 0.5 ? "F" : "M", pos, rand, 0, mother.id);
    mother.offspringIds.push(id);
    mother.offspringMemory ||= {};
    mother.offspringMemory[id] = { x: pos.x, z: pos.z, tick: sim.tick, confidence: 1, source: "birth", dependent: true };
    sim.animals.push(child);
    sim.occupied?.set(key(pos), child.id);
    addRelationship(mother.id, id, "dependency", 1, 1, s.dependency);
    sim.births += 1;
    addEvent(`${id} born to ${mother.id}`);
  }
  mother.pregnant = null;
  mother.lactation = s.dependency;
  mother.postpartum = s.dependency * 0.65;
  mother.energy -= 18;
}

function moveToMemory(a, type, label, arrival) {
  const m = nearestMemory(a, type);
  if (!m) return moveByLongMemory(a, type, `following vague ${type} direction`) || socialWander(a, `searching for ${type}`);
  if (manhattan(a, m) > 0) moveToward(a, m, label);
  else arrival(a);
}
function moveByLongMemory(a, type, label) { const m = (a.longMemory || []).filter((x) => x.type === type).sort((p, q) => q.confidence - p.confidence)[0]; if (!m) return false; const dx = Math.cos(m.bearing), dz = Math.sin(m.bearing); const moves = validMoves(a).sort((p, q) => ((q.x - a.x) * dx + (q.z - a.z) * dz) - ((p.x - a.x) * dx + (p.z - a.z) * dz)); applyMove(a, moves[0], `${label} (${m.distanceBand})`); m.bearing += (rand() - 0.5) * 0.12; return true; }
function graze(a) { if (!canEat(a)) return rest(a, "resting while full"); const c = cellAt(a.x, a.z), shrub = (c.woodland || c.shrubland) && c.plantType === "shrub"; if ((c.woodland && !shrub) || c.rocky || c.sandy || c.wetland || c.water || c.biomass <= 0.02) return wander(a, "seeking grazeable grass"); const bite = Math.min(c.biomass, shrub ? 0.11 : 0.16); c.biomass -= bite; c.shrubBiomass = shrub ? c.biomass : 0; c.grazingPressure = clamp((c.grazingPressure || 0) + bite * 2.5, 0, 1.5); c.grassHeight = clamp((c.grassHeight || 0) - bite * 1.6, 0, 1); if (shrub && c.biomass < 0.06) { c.woodland = false; c.shrubland = false; c.plantType = "grass"; c.woodyStage = "none"; } a.energy = clamp(a.energy + bite * (shrub ? 48 : 42), 0, 120); a.stomach = clamp(a.stomach + bite * (shrub ? 40 : 35), 0, 100); a.lastMealTick = sim.tick; if ((c.plantStage === "reproductive" || c.seedStore > 0.45) && rand() < 0.35) a.seedLoad.push({ plantType: c.plantType, age: 0, viability: 0.65 + rand() * 0.3 }); a.currentAction = shrub ? "browsing shrub" : c.grassHeight > 0.65 ? "grazing long grass" : "grazing short grass"; }
function drink(a) { const source = drinkableSource(a); if (source && a.hydration < 92) { a.hydration = clamp(a.hydration + 24, 0, 100); a.currentAction = `drinking at ${source.lakeLevel !== null ? "lake shore" : `${source.riverClass || "river"} bank`}`; } else if (a.hydration >= 92) { a.currentAction = "leaving water, thirst satisfied"; wander(a, a.currentAction); } else wander(a, "searching for a lake or river"); }
function rest(a, label = "resting") {
  updateTrauma(a);
  const severeTrauma = (a.healthCap || 100) <= 60;
  const sheltered = a.fear < 24 && a.hydration > 30;
  a.fatigue = clamp(a.fatigue - (severeTrauma ? 5.5 : sheltered ? 13 : 7), 0, 100);
  // Rest does not create food: it converts some already-digested stomach reserve
  // into usable energy and avoids the normal movement costs.
  const fuelRecovery = sheltered && a.stomach > 20 ? 0.38 + Math.min(0.62, a.stomach / 150) : 0;
  a.energy = clamp(a.energy + fuelRecovery - 0.04, 0, 120);
  const safeToRecover = a.energy > 34 && a.hydration > 42 && a.stomach > 28 && a.fear < 24;
  if (safeToRecover && a.health < (a.healthCap || 100)) {
    const recovery = severeTrauma ? 0.22 : (a.healthCap || 100) <= 75 ? 0.5 : 0.78;
    a.health = Math.min(a.healthCap || 100, a.health + recovery);
    label = `${label}; recovering`;
  }
  if (fuelRecovery > 0) label = `${label}; restoring energy`;
  a.currentAction = label;
}
function turnInPlace(a, orientation, label) {
  const visual = visualState(a);
  a.orientation = orientation;
  a.visualMove = { fromX: visual.x, fromZ: visual.z, toX: a.x, toZ: a.z, fromOrientation: visual.orientation, toOrientation: orientation, started: performance.now(), duration: clamp(430 / Math.max(1, requestedTicksPerSecond()), 80, 430) };
  a.moveIntent = null; a.currentAction = label;
}
function fearfulListen(a, predator) {
  const bearing = Math.atan2(predator.z - a.z, predator.x - a.x);
  const scan = bearing + Math.sin(sim.tick * 1.7 + a.x * 0.13 + a.z * 0.17) * 0.72;
  turnInPlace(a, scan, "frozen and scanning for danger; listening");
}
function flee(a) { const predator = nearestMemory(a, "predator"); if (predator && a.fear > 54 && rand() < 0.34) return fearfulListen(a, predator); const moves = validMoves(a).sort((p, q) => (predator ? manhattan(q, predator) - manhattan(p, predator) : rand() - 0.5)); applyMove(a, moves[0], a.capabilities?.canSprint ? "sprinting from danger" : "fleeing"); }
function wander(a, label = "exploring") { const moves = validMoves(a); applyMove(a, moves[Math.floor(rand() * moves.length)], label); }
function moveToward(a, target, label) { a.actionTarget = target.id || target.targetId || `${target.x},${target.z}`; const moves = validMoves(a).sort((p, q) => manhattan(p, target) - manhattan(q, target)); applyMove(a, moves[0], label); }
function visualState(a, now = performance.now()) {
  // fx/fz are continuous surface coordinates. x/z remain the hidden ecology
  // grid location used for reproducible contacts, feeding and hydrology.
  if (!a.visualMove) return { x: a.fx ?? a.x, z: a.fz ?? a.z, orientation: a.orientation || 0 };
  const move = a.visualMove, t = clamp((now - move.started) / move.duration, 0, 1);
  const turn = Math.atan2(Math.sin(move.toOrientation - move.fromOrientation), Math.cos(move.toOrientation - move.fromOrientation));
  // Translation stays linear across the whole tick. Easing every one-second
  // segment would make an organism decelerate and accelerate once per tick.
  // Rotation can ease without changing travel speed.
  const turnEase = t * t * (3 - 2 * t);
  return { x: move.fromX + (move.toX - move.fromX) * t, z: move.fromZ + (move.toZ - move.fromZ) * t, orientation: move.fromOrientation + turn * turnEase };
}
function beginAnimalPresentation(starts, now = performance.now()) {
  const ticksPerSecond = requestedTicksPerSecond();
  // A manual Step at the slider's 0 setting still gets a readable one-second
  // transition instead of an effectively infinite animation.
  const duration = ticksPerSecond > 0 ? 1000 / ticksPerSecond : 1000;
  for (const a of sim.animals) {
    if (!a.alive) continue;
    const start = starts.get(a.id);
    if (!start) { a.visualMove = null; continue; }
    const toX = a.fx ?? a.x, toZ = a.fz ?? a.z;
    const distance = Math.hypot(toX - start.x, toZ - start.z);
    // Ordinary locomotion advances less than one world unit per tick. A much
    // larger change is a load/teleport/correction and must not sweep through
    // terrain merely to look smooth.
    if (distance > 3) { a.visualMove = null; continue; }
    a.visualMove = {
      fromX: start.x,
      fromZ: start.z,
      toX,
      toZ,
      fromOrientation: start.orientation,
      toOrientation: a.orientation || 0,
      started: now,
      duration
    };
  }
}
function terrainNormal(x, z) {
  const e = 0.55, left = terrainHeight(x - e, z), right = terrainHeight(x + e, z), back = terrainHeight(x, z - e), front = terrainHeight(x, z + e);
  return new THREE.Vector3(left - right, e * 2, back - front).normalize();
}
function poseOnTerrain(object, visual) {
  object.position.set(visual.x, terrainHeight(visual.x, visual.z), visual.z);
  const slope = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), terrainNormal(visual.x, visual.z));
  const heading = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2 - visual.orientation);
  object.quaternion.copy(slope).multiply(heading);
}
function currentPriority(a) { return a.priorities?.[0]?.drive || a.drive || "explore"; }
const PRESENTATION_STYLES = {
  danger: { colour: 0xff4d57, label: "danger" }, hunting: { colour: 0xc774ff, label: "hunting" }, food: { colour: 0xc9d94e, label: "food" }, water: { colour: 0x59bdff, label: "water" }, reproduction: { colour: 0xff78ae, label: "reproduction" }, family: { colour: 0xf2c55c, label: "family" }, rest: { colour: 0x91a4bd, label: "rest" }, social: { colour: 0x5edbd3, label: "social" }, scavenge: { colour: 0xd1aa76, label: "scavenging" }, exploration: { colour: 0x73d3b1, label: "exploration" }, unknown: { colour: 0xd7ddd8, label: "intent" }
};
function priorityCategory(priority) {
  const value = String(priority || "").toLowerCase();
  if (/threat|fear|flee|danger/.test(value)) return "danger";
  if (/hunt|prey/.test(value)) return "hunting";
  if (/hunger|food|graze|feed/.test(value)) return "food";
  if (/thirst|water|drink/.test(value)) return "water";
  if (/reproduction|courtship|mate/.test(value)) return "reproduction";
  if (/offspring|parent|dependency|caregiver|safeguard/.test(value)) return "family";
  if (/fatigue|rest|sleep|recover|digest/.test(value)) return "rest";
  if (/group|social|herd/.test(value)) return "social";
  if (/scavenge|carcass/.test(value)) return "scavenge";
  if (/explore|wander|orient/.test(value)) return "exploration";
  return "unknown";
}
function actionPresentation(a) {
  const text = String(a.currentAction || "").toLowerCase();
  let key = a.moveIntent ? "travelling" : "idle", posture = a.moveIntent ? "travel" : "idle";
  const rules = [[/sprint|fleeing|running from|escaping/, "fleeing", "flee"], [/backing away|retreating while watching/, "backing-away", "reverse"], [/stalk|moving quietly/, "stalking", "stalk"], [/chasing|pursuing|rushing to protect/, "chasing", "chase"], [/listening|frozen and scanning/, "listening", "listen"], [/searching|scanning|last known|last-known/, "searching", "scan"], [/tracking|scent/, "tracking-scent", "sniff"], [/guarding|defending|protect/, "guarding", "guard"], [/grazing|browsing|feeding/, "eating", "feed"], [/drinking/, "drinking", "drink"], [/resting|recovering|sleeping|digest/, "resting", "rest"], [/courtship/, "courtship", "court"], [/blocked|occupied|cannot reach/, "blocked", "blocked"]];
  for (const [pattern, actionKey, actionPosture] of rules) if (pattern.test(text)) { key = actionKey; posture = actionPosture; break; }
  return { key, posture, label: a.currentAction || "idle" };
}
function knownContactFor(a, targetId) {
  if (!targetId) return null;
  return [...(a.sensoryBuffer || []), ...(a.memories || [])].filter((contact) => contact.targetId === targetId).sort((left, right) => (right.confidence || 0) - (left.confidence || 0))[0] || null;
}
function presentationCause(a, category, action) {
  if (category === "danger" && a.threatEvidence?.score > 0) return { kind: "threat", targetId: a.threatEvidence.sourceId || null, x: a.threatEvidence.x, z: a.threatEvidence.z, channel: a.threatEvidence.channel || "unknown", confidence: clamp(a.threatEvidence.score / 100, .2, 1), label: a.threatEvidence.explanation };
  let targetId = typeof a.actionTarget === "string" && !a.actionTarget.includes(",") ? a.actionTarget : a.hunt?.targetId || null;
  if (!targetId && category === "family") targetId = knownOffspringContact(a)?.targetId || a.motherId || null;
  if (!targetId && category === "social") targetId = a.groupLeaderId || a.groupAlert?.source || null;
  const contact = knownContactFor(a, targetId);
  if (contact) return { kind: category, targetId, x: contact.x, z: contact.z, channel: contact.channel || "memory", confidence: clamp(contact.confidence ?? .5, .15, 1), label: `${contact.channel || "remembered"} evidence about ${targetId}` };
  if (typeof a.actionTarget === "string" && a.actionTarget.includes(",")) { const [x, z] = a.actionTarget.split(",").map(Number); if (Number.isFinite(x) && Number.isFinite(z)) return { kind: category, targetId: null, x, z, channel: "memory", confidence: .55, label: "remembered destination" }; }
  if (a.moveIntent && ["food", "water", "exploration", "scavenge"].includes(category)) return { kind: category, targetId: null, x: a.moveIntent.x, z: a.moveIntent.z, channel: /remember|vague/.test(action.label) ? "memory" : "intent", confidence: .65, label: "intended destination" };
  return null;
}
function deriveEntityPresentation(a, now = performance.now()) {
  const priority = currentPriority(a), category = priorityCategory(priority), action = actionPresentation(a), visual = visualState(a, now), move = a.visualMove;
  const vx = move?.duration ? (move.toX - move.fromX) / (move.duration / 1000) : 0, vz = move?.duration ? (move.toZ - move.fromZ) / (move.duration / 1000) : 0, speed = Math.hypot(vx, vz);
  const movementDirection = speed > .001 ? Math.atan2(vz, vx) : null;
  const intended = a.moveIntent || a.motionTarget;
  let intendedDirection = intended ? Math.atan2(intended.z - visual.z, intended.x - visual.x) : movementDirection;
  const cause = presentationCause(a, category, action);
  if (category === "danger" && cause && !intended) intendedDirection = Math.atan2(visual.z - cause.z, visual.x - cause.x);
  const reverseDelta = movementDirection === null ? 0 : Math.atan2(Math.sin(movementDirection - visual.orientation), Math.cos(movementDirection - visual.orientation));
  const state = { entityId: a.id, priority: { key: priority, category, score: a.priorities?.[0]?.score || 0 }, action, cause, movement: { facingDirection: visual.orientation, movementDirection, intendedDirection, speed, stationary: speed < .015, movingBackward: Math.abs(reverseDelta) > Math.PI * .65 }, expression: { key: emotionState(a) }, health: { percentage: clamp(a.health, 0, 100), cap: a.healthCap ?? 100, tier: healthTier(a) }, communication: animalCall(a) };
  entityPresentationCache.set(a.id, state); return state;
}
function evidencePhrase(cause) {
  if (!cause) return "its internal state currently makes this the strongest option";
  if (cause.channel === "sight" || cause.channel === "visual-signal") return cause.targetId ? `it can see ${cause.targetId}` : "it can see the relevant location";
  if (cause.channel === "hearing") return cause.targetId ? `it heard ${cause.targetId}` : "it heard an uncertain nearby source";
  if (cause.channel === "smell") return cause.targetId ? `it detected ${cause.targetId}'s scent` : "it detected a relevant scent";
  if (cause.channel === "memory") return cause.targetId ? `it remembers ${cause.targetId}'s last-known location` : "it is following a remembered location";
  return cause.label || "it has relevant evidence";
}
function intendedResult(state) {
  if (state.action.key === "fleeing") return "increase its distance from danger";
  if (state.action.key === "backing-away") return "keep the threat in view while retreating";
  if (state.action.key === "searching") return state.priority.category === "hunting" ? "reacquire its prey" : "find stronger evidence";
  if (state.action.key === "stalking") return "approach prey without producing much noise";
  if (state.action.key === "chasing") return state.priority.category === "family" ? "reach and protect its offspring" : "reach its target";
  if (state.action.key === "guarding") return "keep the protected entity safe";
  if (state.action.key === "blocked") return "find another usable route";
  if (state.priority.category === "water") return "reach drinkable water";
  if (state.priority.category === "food") return "reach food";
  if (state.priority.category === "reproduction") return "reach a suitable mate";
  return "satisfy its current highest priority";
}
function causalExplanation(a, state = deriveEntityPresentation(a)) { return `${state.action.label} because ${evidencePhrase(state.cause)}, intending to ${intendedResult(state)}.`; }
function updateEntityIndicators(rendered, a, now = performance.now()) {
  let healthBar = rendered.userData.healthBar;
  if (!healthBar) {
    healthBar = new THREE.Sprite(healthBarMaterial(a));
    healthBar.renderOrder = 80; rendered.add(healthBar); rendered.userData.healthBar = healthBar;
  }
  const scale = animalVisualScale(a), showHealth = a.health < 99.5;
  healthBar.visible = showHealth;
  if (showHealth) {
    healthBar.material = healthBarMaterial(a);
    healthBar.position.set(0, 2.28 * scale, 0);
    const pulse = healthTier(a) === "critical" ? 1 + Math.sin(now * .012) * .08 : 1;
    healthBar.scale.set(1.7 * scale * pulse, .43 * scale * pulse, 1);
  }

  let thought = rendered.userData.thoughtBubble;
  if (!thought) {
    thought = new THREE.Sprite(thoughtBubbleMaterial(a, currentPriority(a)).clone());
    thought.material.depthTest = false; thought.material.depthWrite = false; thought.renderOrder = 90;
    rendered.add(thought); rendered.userData.thoughtBubble = thought;
  }
  const priority = currentPriority(a);
  let state = entityThoughtStates.get(a.id);
  if (!state) { state = { priority, until: 0, started: 0 }; entityThoughtStates.set(a.id, state); }
  else if (state.priority !== priority) {
    state.priority = priority; state.started = now; state.until = now + 2400;
    const source = thoughtBubbleMaterial(a, priority);
    thought.material.map = source.map; thought.material.needsUpdate = true;
  }
  const visible = now < state.until;
  const urgentImpact = (a.attackFlashUntil || 0) > sim.tick || (a.injuryFlashUntil || 0) > sim.tick;
  thought.visible = visible && !urgentImpact;
  if (thought.visible) {
    const elapsed = now - state.started, remaining = state.until - now;
    thought.material.opacity = Math.min(1, elapsed / 180, remaining / 420);
    thought.position.set(.62 * scale, 3.18 * scale + Math.sin(now * .004) * .06, 0);
    thought.scale.set(2.25 * scale, 1.6 * scale, 1);
  }
  let sexMarker = rendered.userData.sexMarker;
  if (!sexMarker) { sexMarker = new THREE.Sprite(sexBadgeMaterial(a.sex)); sexMarker.renderOrder = 72; rendered.add(sexMarker); rendered.userData.sexMarker = sexMarker; }
  sexMarker.visible = selectedId === a.id || /reproduction|courtship|mate/.test(currentPriority(a)) || (a.courtshipUntil || 0) > sim.tick;
  if (sexMarker.visible) { sexMarker.position.set(-.72 * scale, 1.35 * scale, 0); sexMarker.scale.set(.38 * scale, .38 * scale, .38 * scale); }
  const action = actionPresentation(a), category = priorityCategory(currentPriority(a));
  let actionBadge = rendered.userData.actionBadge;
  if (!actionBadge) { actionBadge = new THREE.Sprite(actionBadgeMaterial(action.key, category)); actionBadge.renderOrder = 74; rendered.add(actionBadge); rendered.userData.actionBadge = actionBadge; }
  const unusualAction = ["fleeing", "backing-away", "stalking", "chasing", "searching", "listening", "tracking-scent", "guarding", "blocked"].includes(action.key);
  actionBadge.visible = unusualAction && !urgentImpact;
  if (actionBadge.visible) { actionBadge.material = actionBadgeMaterial(action.key, category); actionBadge.position.set(.72 * scale, 1.48 * scale, 0); actionBadge.scale.set(.4 * scale, .4 * scale, .4 * scale); }
}
function updateEntityPosture(rendered, state, now) {
  const parts = rendered.userData.parts;
  if (!parts) return;
  for (const part of Object.values(parts)) {
    const rest = part?.userData.restTransform;
    if (!rest) continue;
    part.position.copy(rest.position); part.rotation.copy(rest.rotation); part.scale.copy(rest.scale);
  }
  const stride = Math.sin(now * (state.action.posture === "flee" || state.action.posture === "chase" ? .018 : .009));
  if (["travel", "flee", "chase"].includes(state.action.posture)) parts.body.position.y += Math.abs(stride) * .055;
  if (state.action.posture === "flee") { parts.body.rotation.x -= .16; if (parts.head) { parts.head.rotation.x -= .08; parts.head.position.z += .07; } if (parts.tail) parts.tail.rotation.x -= .15 + stride * .08; }
  else if (state.action.posture === "chase") { parts.body.rotation.x -= .12; if (parts.head) parts.head.position.z += .06; }
  else if (state.action.posture === "stalk") { parts.body.position.y -= .12; parts.body.rotation.x -= .08; if (parts.head) parts.head.position.y -= .08; if (parts.tail) parts.tail.rotation.x += .22; }
  else if (state.action.posture === "scan") { if (parts.head) parts.head.rotation.y += Math.sin(now * .0035) * .65; }
  else if (state.action.posture === "listen") { if (parts.head) { parts.head.position.y += .12; parts.head.rotation.y += Math.sin(now * .0022) * .22; } }
  else if (state.action.posture === "sniff") { if (parts.head) { parts.head.position.y -= .12; parts.head.rotation.y += Math.sin(now * .003) * .28; } }
  else if (state.action.posture === "feed" || state.action.posture === "drink") { if (parts.head) { parts.head.position.y -= .22; parts.head.rotation.x += .28; } }
  else if (state.action.posture === "rest") { parts.body.position.y -= .18; parts.body.scale.y *= .82; if (parts.head) parts.head.position.y -= .12; }
  else if (state.action.posture === "guard") { parts.body.position.y += .05; if (parts.head) parts.head.position.y += .08; }
  else if (state.action.posture === "blocked") { parts.body.position.z += Math.sin(now * .009) * .025; }
}
function ensureEntityIntent(a) {
  if (entityIntentCache.has(a.id)) return entityIntentCache.get(a.id);
  const root = new THREE.Group();
  const halo = new THREE.Mesh(geos.ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide })); halo.rotation.x = -Math.PI / 2; halo.renderOrder = 26; root.add(halo);
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1.5, 0xffffff, .42, .24); arrow.renderOrder = 27; root.add(arrow);
  const connectorGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const connector = new THREE.Line(connectorGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .65, depthWrite: false })); connector.renderOrder = 25; root.add(connector);
  const causeMarker = new THREE.Mesh(geos.marker, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75, depthWrite: false })); causeMarker.renderOrder = 28; root.add(causeMarker);
  const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .3, depthWrite: false })); trail.renderOrder = 24; root.add(trail);
  const callRing = new THREE.Mesh(geos.ring, communicationMat.clone()); callRing.rotation.x = -Math.PI / 2; callRing.renderOrder = 29; root.add(callRing);
  groups.intent.add(root);
  const item = { root, halo, arrow, connector, causeMarker, trail, callRing };
  entityIntentCache.set(a.id, item); return item;
}
function connectorColour(state) {
  if (state.cause?.channel === "hearing") return 0xffd166;
  if (state.cause?.channel === "smell") return 0x53d9ff;
  if (state.cause?.channel === "memory") return 0x75a7ff;
  return PRESENTATION_STYLES[state.priority.category]?.colour ?? 0xd7ddd8;
}
function updateMotionTrail(a, state, item, now, visual) {
  let history = entityMotionHistory.get(a.id);
  if (!history) { history = { sampledAt: 0, points: [] }; entityMotionHistory.set(a.id, history); }
  if (now - history.sampledAt >= 120) { history.sampledAt = now; history.points.push({ x: visual.x, z: visual.z, time: now }); }
  history.points = history.points.filter((point) => now - point.time <= 1600).slice(-16);
  const important = a.id === selectedId || ["fleeing", "chasing", "stalking", "searching", "backing-away"].includes(state.action.key) || state.health.tier === "critical";
  item.trail.visible = important && history.points.length > 1;
  if (item.trail.visible) {
    item.trail.geometry.dispose();
    item.trail.geometry = new THREE.BufferGeometry().setFromPoints(history.points.map((point) => new THREE.Vector3(point.x, terrainHeight(point.x, point.z) + .08, point.z)));
    item.trail.material.color.set(PRESENTATION_STYLES[state.priority.category]?.colour ?? 0xd7ddd8);
    item.trail.material.opacity = state.action.key === "stalking" ? .22 : state.action.key === "fleeing" ? .7 : .38;
  }
}
function updateWorldPresentation(a, state, now) {
  const item = ensureEntityIntent(a), visual = visualState(a, now), style = PRESENTATION_STYLES[state.priority.category] || PRESENTATION_STYLES.unknown;
  item.root.visible = true; item.halo.position.set(visual.x, terrainHeight(visual.x, visual.z) + .08, visual.z);
  const urgent = ["danger", "hunting", "reproduction", "family"].includes(state.priority.category) || ["searching", "blocked"].includes(state.action.key) || a.id === selectedId;
  item.halo.visible = urgent; item.halo.material.color.set(style.colour); item.halo.material.opacity = state.priority.category === "danger" ? .55 : .3;
  const haloPulse = state.priority.category === "danger" ? 1 + Math.sin(now * .012) * .1 : 1; item.halo.scale.setScalar((state.action.key === "searching" ? 1.22 : .92) * animalVisualScale(a) * haloPulse);
  const angle = state.movement.intendedDirection, arrowOrigin = new THREE.Vector3(visual.x, terrainHeight(visual.x, visual.z) + .18, visual.z);
  item.arrow.visible = angle !== null && (!state.movement.stationary || ["blocked", "searching"].includes(state.action.key) || a.id === selectedId);
  if (item.arrow.visible) { const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)); item.arrow.position.copy(arrowOrigin); item.arrow.setDirection(direction); item.arrow.setLength(state.action.key === "fleeing" ? 2.5 : 1.75, .48, .28); item.arrow.setColor(style.colour); }
  const showConnector = Boolean(state.cause) && (a.id === selectedId || ["danger", "hunting", "reproduction", "family"].includes(state.priority.category));
  item.connector.visible = item.causeMarker.visible = showConnector;
  if (showConnector) {
    const colour = connectorColour(state), positions = item.connector.geometry.attributes.position.array;
    positions[0] = visual.x; positions[1] = terrainHeight(visual.x, visual.z) + .5; positions[2] = visual.z; positions[3] = state.cause.x; positions[4] = terrainHeight(state.cause.x, state.cause.z) + .45; positions[5] = state.cause.z; item.connector.geometry.attributes.position.needsUpdate = true;
    item.connector.material.color.set(colour); item.connector.material.opacity = (state.cause.channel === "memory" ? .32 : .72) * state.cause.confidence;
    item.causeMarker.material.color.set(colour); item.causeMarker.material.opacity = .35 + state.cause.confidence * .5; item.causeMarker.position.set(state.cause.x, terrainHeight(state.cause.x, state.cause.z) + .42, state.cause.z);
    const uncertainty = state.cause.channel === "hearing" ? 1.8 - state.cause.confidence : .45; item.causeMarker.scale.set(uncertainty, .25, uncertainty);
  }
  item.callRing.visible = Boolean(state.communication);
  if (item.callRing.visible) { const phase = ((now / 900) % 1), radius = .5 + phase * 1.5; item.callRing.position.set(visual.x, terrainHeight(visual.x, visual.z) + .12, visual.z); item.callRing.scale.set(radius, radius, radius); item.callRing.material.opacity = .8 * (1 - phase); }
  updateMotionTrail(a, state, item, now, visual);
}
function syncAnimalVisuals(now) {
  for (const [id, rendered] of animalRenderCache) {
    const a = animalById(id);
    if (!a?.alive || !rendered.visible) continue;
    const state = deriveEntityPresentation(a, now);
    poseOnTerrain(rendered, visualState(a, now));
    updateEntityPosture(rendered, state, now);
    updateEntityIndicators(rendered, a, now);
    updateWorldPresentation(a, state, now);
  }
}
function terrainTravelEffects(c, speciesId) {
  const cover = c?.landCover || (c?.woodland ? "youngWoodland" : c?.shrubland ? "bushland" : (c?.grassHeight || 0) > .68 ? "longGrass" : "shortGrass");
  const hunter = speciesId === "hunter";
  if (cover === "longGrass") return { speed: hunter ? .80 : .90, noise: 1.28, energy: 1.08, label: "moving through long grass" };
  if (cover === "bushland" || cover === "dryScrub") return { speed: hunter ? .76 : .70, noise: 1.60, energy: 1.16, label: "pushing through scrub" };
  if (cover === "youngWoodland" || cover === "matureForest") return { speed: hunter ? .70 : .66, noise: .90, energy: 1.18, label: "moving through woodland" };
  if (cover === "wetMeadow") return { speed: .78, noise: .88, energy: 1.20, label: "crossing wet meadow" };
  if (cover === "swamp") return { speed: .55, noise: .72, energy: 1.55, label: "crossing swamp" };
  if (cover === "snow") return { speed: .72, noise: .90, energy: 1.30, label: "crossing snow" };
  if (cover === "rock" || cover === "alpineRock") return { speed: .70, noise: .82, energy: 1.40, label: "crossing rocky ground" };
  if (cover === "sand") return { speed: .80, noise: .98, energy: 1.22, label: "crossing sand" };
  if (cover === "bareDirt") return { speed: .94, noise: 1.02, energy: 1.04, label: "crossing bare ground" };
  return { speed: 1, noise: 1, energy: 1, label: "moving across grassland" };
}
function applyMove(a, p, label) {
  if (!p) return;
  a.fx ??= a.x; a.fz ??= a.z;
  const old = { x: a.x, z: a.z }, destination = cellAt(p.x, p.z);
  const moved = p.x !== old.x || p.z !== old.z;
  const stalking = a.speciesId === "hunter" && /stalk|track|approach/.test(label);
  const pace = label.includes("sprint") ? 1 : stalking ? 0.22 : label.includes("flee") ? 0.82 : 0.52;
  if (!moved) { a.motionTarget = null; a.movementNoise = 0; a.currentAction = label; return; }
  if (!a.motionTarget || a.motionTarget.x !== p.x || a.motionTarget.z !== p.z) a.motionTarget = { x: p.x, z: p.z };
  const dx = a.motionTarget.x - a.fx, dz = a.motionTarget.z - a.fz, remaining = Math.hypot(dx, dz);
  const desiredHeading = Math.atan2(dz, dx);
  const turn = Math.atan2(Math.sin(desiredHeading - (a.orientation || 0)), Math.cos(desiredHeading - (a.orientation || 0)));
  a.orientation = (a.orientation || 0) + clamp(turn, -0.48, 0.48);
  // Slow/stalking movement genuinely advances less distance each simulation tick.
  const wading = (destination?.waterDepth || 0) > 0;
  const terrainEffect = terrainTravelEffects(destination, a.speciesId);
  const step = clamp((a.capabilities?.speed || 1) * (0.16 + pace * 0.58) * terrainEffect.speed * (wading ? 0.55 : 1), 0.05, 0.78);
  const climbing = Math.max(0, terrainHeight(a.motionTarget.x, a.motionTarget.z) - terrainHeight(a.fx, a.fz));
  const footing = destination?.rocky ? 0.24 : destination?.sandy ? 0.09 : 0;
  const travelled = Math.min(step, remaining);
  if (remaining > 0.001) { a.fx += dx / remaining * travelled; a.fz += dz / remaining * travelled; }
  const arrived = remaining <= step + 0.001;
  if (arrived) {
    a.fx = p.x; a.fz = p.z; sim.occupied?.delete(key(old)); sim.occupied?.set(key(p), a.id); a.x = p.x; a.z = p.z; a.motionTarget = null;
  }
  a.visualMove = null;
  a.moveIntent = { x: p.x, z: p.z, label, pace };
  const coverNoise = terrainEffect.noise;
  a.movementNoise = clamp(pace * coverNoise * (arrived ? 1 : 0.72), 0, 1.4);
  a.energy -= ((0.22 / Math.max(0.18, (a.capabilities?.speed || 1) * (stalking ? 0.48 : 1))) * travelled * (wading ? 1.5 : 1) + climbing * 0.36 + footing * travelled) * terrainEffect.energy;
  a.fatigue += (((a.lifeStage === "old" ? 2.2 : label.includes("sprint") ? 3.6 : stalking ? 0.55 : 1.4) * travelled) + climbing * 0.8 + footing) * terrainEffect.energy;
  a.currentAction = climbing > 0.15 ? `${label}; climbing surface` : wading ? `${label}; wading shallow water` : stalking ? `${label}; moving quietly through cover` : terrainEffect.label !== "moving across grassland" ? `${label}; ${terrainEffect.label}` : footing ? `${label}; difficult footing` : label;
}

function die(a, cause, ownerId = null) { if (!a.alive) return; a.alive = false; sim.occupied?.delete(key(a)); a.deathTick = sim.tick; sim.deaths += 1; sim.corpses.push({ id: `corpse-${a.id}`, sourceId: a.id, ownerId, x: a.x, z: a.z, biomass: a.bodyMass * 0.52, initialBiomass: a.bodyMass * 0.52, age: 0, cause, deathDay: sim.day, lived: a.age, speciesId: a.speciesId, sex: a.sex, lifeStage: a.lifeStage, offspring: a.offspringIds.length, finalEnergy: a.energy, finalHydration: a.hydration, timeline: [...a.timeline, `died day ${sim.day}: ${cause}`] }); addEvent(`${a.id} died: ${cause}`); for (const child of sim.animals.filter((o) => o.motherId === a.id && o.alive)) child.energy -= 28; for (const parent of sim.animals) if (parent.offspringIds) parent.offspringIds = parent.offspringIds.filter((id) => id !== a.id); }
function decayCorpses() { for (const corpse of sim.corpses) { corpse.age += 1; const t = localTemperatureAt(corpse); const rotLimit = t > 25 ? 60 : t < 5 ? 120 : 84; if (corpse.biomass > 0) corpse.biomass = Math.max(0, corpse.biomass - corpse.initialBiomass / rotLimit); if (corpse.biomass <= 0.03 || corpse.age >= rotLimit) { corpse.biomass = 0; corpse.eaten = true; corpse.skeletonAge = (corpse.skeletonAge || 0) + 1; } const c = cellAt(corpse.x, corpse.z); c.fertility = clamp(c.fertility + 0.0015, 0, 1); } sim.corpses = sim.corpses.filter((c) => !c.eaten || c.skeletonAge < 365 * 24); }
function reproductionDrive(a) { const mod = seasonMods[sim.season].breed; const cycle = fertilityCycle(a); if (!(a.capabilities?.canMate) || mod <= 0 || a.postpartum > 0) return 0; if (a.sex === "F" && !cycle.fertile) return 0; const readiness = 55 + (a.energy - species[a.speciesId].reproductionEnergy) * 0.8; return (a.sex === "F" ? readiness + 30 : readiness * 0.38) * mod; }
function mature(a) { return a.lifeStage === "adult" || a.lifeStage === "old"; }
function stageForAge(s, age, motherId) { if (motherId) return "dependent"; if (age < s.matureAge * 0.45) return "juvenile"; if (age < s.matureAge) return "subadult"; if (age > s.oldAge) return "old"; return "adult"; }
function bodyScale(s, age) { return clamp(0.28 + age / s.matureAge * 0.72, 0.22, age > s.oldAge ? 0.92 : 1); }
function stageCost(a) { return a.lifeStage === "dependent" ? 0.55 : a.lifeStage === "old" ? 1.25 : 1; }
function weatherCost(a) { const t = localTemperatureAt(a); a.tempStress = t < -5 ? -t - 5 : t > 31 ? t - 31 : 0; return 1 + a.tempStress * 0.025; }
function ageDecline(a, s) { if (a.age <= s.oldAge) return; const decline = (a.age - s.oldAge) / (s.maxAge - s.oldAge); a.health -= Math.max(0, decline) * 0.035; }
function targetScore(a, p) { return dist(a, p) + (p.lifeStage === "dependent" ? -6 : 0) + (p.lifeStage === "old" ? -2 : 0) + p.health / 40; }

function terrainDetailStride() {
  // The fine square field is the minimum visual resolution at every zoom.
  return 2;
}

function renderAll() { return profiler.measure("animal presentation rebuild/update", renderAllWork); }
function renderAllWork() {
  const observer = selectedAnimal();
  const entityFocus = Boolean(observer && ui.overlayEntityFocus?.checked);
  groups.plants.visible = !entityFocus;
  groups.water.visible = !entityFocus;
  profiler.measure("fog", () => updateKnowledgeFog(observer));
  const detail = terrainDetailStride();
  const observerKey = observer ? `${observer.id}:${observer.x},${observer.z}:${Math.round((observer.orientation || 0) * 8)}` : "laboratory";
  if (detail !== lastTerrainDetail) { lastTerrainDetail = detail; landscapeDirty = true; }
  const refreshLandscape = landscapeDirty || lastLandscapeTick < 0 || observerKey !== lastTerrainObserverKey;
  if (refreshLandscape) {
    profiler.measure("vegetation rebuild", () => {
      clear(groups.plants);
      updateTerrainColours();
      drawTerrainFields(observer, detail);
      drawVegetationRegions(detail, observer);
    });
    landscapeDirty = false;
    lastLandscapeTick = sim.tick;
    lastTerrainObserverKey = observerKey;
  }
  const aliveIds = new Set(sim.animals.filter((a) => a.alive).map((a) => a.id));
  for (const [id, group] of animalRenderCache) if (!aliveIds.has(id)) { groups.animals.remove(group); animalRenderCache.delete(id); const intent = entityIntentCache.get(id); if (intent) groups.intent.remove(intent.root); entityIntentCache.delete(id); entityPresentationCache.delete(id); entityMotionHistory.delete(id); entityThoughtStates.delete(id); }
  for (const group of animalRenderCache.values()) group.visible = false;
  for (const item of entityIntentCache.values()) item.root.visible = false;
  clear(groups.overlays); clear(groups.corpses); pickables.clear();
  profiler.measure("overlays", () => { if (!entityFocus && ui.overlayPheromone.checked) drawScentTrails(observer); });
  profiler.measure("corpse rendering", () => { if (!entityFocus) for (const corpse of sim.corpses) { if (observer && dist(observer, corpse) > awarenessRange(observer)) continue; drawRemains(corpse); } });
  const cameraDistance = camera.position.distanceTo(controls.target);
  const strategicMap = !observer && cameraDistance > 260;
  const groupMap = !observer && cameraDistance > 110;
  // Rendering only nearby organisms is presentation culling: every organism
  // continues to simulate, but objects well outside the current view do not
  // consume scene-update work.
  const drawRadius = clamp(cameraDistance * 0.72, 78, 190);
  const displayAnimals = sim.animals.filter((x) => x.alive && !strategicMap && !groupMap && (!observer ? Math.hypot(x.x - controls.target.x, x.z - controls.target.z) <= drawRadius : x.id === observer.id || observer.sensoryBuffer.some((m) => m.targetId === x.id && m.channel === "sight")));
  renderedAnimalCount = displayAnimals.length;
  for (const a of displayAnimals) drawAnimal(a);
  profiler.measure("overlays", () => {
    drawReproductiveHighlights();
    if (!observer) drawMapMarkers();
    drawSelectedOverlays();
  });
}

function terrainColour(c) {
  if (c.water) return c.waterLevel > 0.72 ? [26, 93, 158] : [51, 137, 194];
  if (c.terrainClass === "snow") return [218, 230, 232];
  if (c.terrainClass === "rock") return [101, 110, 107];
  if (c.terrainClass === "sand") return [190, 164, 91];
  if (c.terrainClass === "dirt") return [116, 87, 55];
  if (c.terrainClass === "dryGrass") return [150, 131, 78];
  if (c.terrainClass === "forest" || c.terrainClass === "woodland") return [31, 76, 51];
  if (c.terrainClass === "shrubland") return [55, 99, 53];
  const vitality = clamp(c.biomass || 0, 0, 1);
  return [55 + Math.round(vitality * 25), 104 + Math.round(vitality * 43), 62 + Math.round(vitality * 18)];
}

function visualTerrainColour(cell) {
  if (!cell) return [24, 32, 28];
  // Water is expanded by one visual cell only, so narrow rivers remain legible
  // without changing the hydrology or where animals may drink.
  const nearWater = neighbors(cell).some((p) => inside(p.x, p.z) && cellAt(p.x, p.z).water);
  return cell.water || nearWater ? (cell.waterLevel > 0.72 ? [26, 93, 158] : [51, 137, 194]) : terrainColour(cell);
}

function updateTerrainColours() {
  // Hex terrain uses material groups, not a legacy sampled colour texture.
  if (groundMesh?.userData.hexTerrain) return;
  if (!groundMesh || !groundColours) return;
  let plants = 0;
  const positions = groundMesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = clamp(Math.round(positions.getX(i)), -HALF, HALF - 1);
    const z = clamp(Math.round(groundMesh.userData.hexTerrain ? positions.getZ(i) : -positions.getY(i)), -HALF, HALF - 1);
    const cell = cellAt(x, z);
    if (!cell.water && cell.biomass > 0.2) plants += 1;
    const [r, g, b] = visualTerrainColour(cell);
    groundColours.setXYZ(i, r / 255, g / 255, b / 255);
  }
  groundColours.needsUpdate = true;
  sim.plantCount = plants;
}

function hexMaterialIndexAt(x, z) {
  const c = cellAt(x, z);
  // Active rivers retain their ecological ground beneath the narrow blue
  // ribbon. Water state is for physics, not an instruction to paint mud.
  if (c?.waterChannel) {
    const bank = c.neighbours.filter((n) => !n.water).sort((a, b) => (b.woodland ? 2 : b.wetland ? 1 : b.biomass) - (a.woodland ? 2 : a.wetland ? 1 : a.biomass))[0];
    const natural = bank || c;
    return natural.rocky ? 7 : natural.sandy ? 4 : natural.wetland ? 6 : natural.woodland ? 2 : natural.biomass < .18 ? 3 : 0;
  }
  return ({ grass: 0, grassland: 0, longGrass: 1, forest: 2, woodland: 2, shrubland: 11, dirt: 3, dryGrass: 10, sand: 4, mud: 5, wetland: 6, rock: 7, snow: 8 })[c?.terrainClass || "dirt"] ?? 3;
}

function drawTerrainFields() { sim.plantCount = sim.cells.reduce((count, c) => count + (!c.water && c.biomass > 0.2 ? 1 : 0), 0); }

function drawRemains(corpse) { const y = terrainHeight(corpse.x, corpse.z); if (!corpse.eaten) { const mesh = new THREE.Mesh(geos.corpse, mats.corpse); const amount = clamp(corpse.biomass / Math.max(1, corpse.initialBiomass), 0.25, 1); mesh.scale.set(0.75 + amount * 0.5, 0.7 + amount * 0.4, 0.75 + amount * 0.5); mesh.position.set(corpse.x, y + 0.16, corpse.z); mesh.userData.id = corpse.id; groups.corpses.add(mesh); pickables.set(corpse.id, mesh); return; } const bones = new THREE.Group(); for (let i = 0; i < 3; i++) { const bone = new THREE.Mesh(geos.bone, mats.skeleton); bone.rotation.y = i * Math.PI / 3; bone.position.y = 0.1 + i * 0.025; bones.add(bone); if (i === 0) { bone.userData.id = corpse.id; pickables.set(corpse.id, bone); } } const skull = new THREE.Mesh(geos.marker, mats.skeleton); skull.scale.set(1.7, 1.3, 1.4); skull.position.set(0.5, 0.16, 0); bones.add(skull); bones.position.set(corpse.x, y, corpse.z); groups.corpses.add(bones); }

function drawClimateZones() { if (sim.season !== "Winter" && sim.season !== "Summer") return; const north = sim.season === "Winter"; const zone = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD * 0.45), north ? climateMats.snow : climateMats.heat); zone.rotation.x = -Math.PI / 2; zone.position.set(-0.5, 0.035, north ? -WORLD * 0.275 : WORLD * 0.275); groups.overlays.add(zone); }
function drawScentTrails(observer = null) { const known = observer ? new Set([...(observer.sensoryBuffer || []), ...(observer.memories || [])].filter((m) => m.type === "preyTrail" || m.type === "predator").map((m) => `${m.x},${m.z}`)) : null; const trails = { grazer: [], hunter: [] }; for (const k of Object.keys(sim.activeScent || {})) { if (known && !known.has(k)) continue; const [x, z] = k.split(",").map(Number), c = cellAt(x, z); if (!c) continue; const grazer = c.scent?.grazer || 0, hunter = c.scent?.hunter || 0, kind = grazer >= hunter ? "grazer" : "hunter", strength = Math.max(grazer, hunter); if (strength >= 0.22) trails[kind].push({ c, strength }); } const dummy = new THREE.Object3D(); for (const kind of ["grazer", "hunter"]) { const marks = trails[kind]; if (!marks.length) continue; const mesh = new THREE.InstancedMesh(geos.marker, scentMats[kind], marks.length); marks.forEach(({ c, strength }, i) => { const size = 2.2 + clamp(strength / 5, 0.08, 0.55) * 3.2; dummy.position.set(c.x, terrainHeight(c.x, c.z) + 0.25, c.z); dummy.scale.set(size, size * 0.42, size); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.instanceMatrix.needsUpdate = true; groups.overlays.add(mesh); } }

function mapBadgeMaterial(kind, colour) {
  const id = `${kind}|${colour}`;
  if (mapBadgeMaterials.has(id)) return mapBadgeMaterials.get(id);
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96;
  const c = canvas.getContext("2d"); c.translate(48, 48); c.fillStyle = "rgba(9,15,12,.78)"; c.strokeStyle = colour; c.lineWidth = 8; c.beginPath();
  if (kind === "hunter") { c.moveTo(0, -33); c.lineTo(31, 28); c.lineTo(-31, 28); c.closePath(); }
  else if (kind === "family") { c.arc(0, 0, 28, 0, Math.PI * 2); }
  else { c.moveTo(0, -32); c.lineTo(32, 0); c.lineTo(0, 32); c.lineTo(-32, 0); c.closePath(); }
  c.fill(); c.stroke();
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }); mapBadgeMaterials.set(id, material); return material;
}

function mapCountMaterial(kind, count, colour) {
  const id = `count|${kind}|${count}|${colour}`;
  if (mapBadgeMaterials.has(id)) return mapBadgeMaterials.get(id);
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d"); c.translate(64, 64); c.fillStyle = "rgba(8,14,12,.88)"; c.strokeStyle = colour; c.lineWidth = 9; c.beginPath();
  if (kind === "hunter") { c.moveTo(0, -43); c.lineTo(42, 35); c.lineTo(-42, 35); c.closePath(); }
  else c.arc(0, 0, 43, 0, Math.PI * 2);
  c.fill(); c.stroke(); c.fillStyle = "#f4fff8"; c.font = "bold 43px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(count), 0, 3);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }); mapBadgeMaterials.set(id, material); return material;
}

function courtshipHeartMaterial() {
  if (heartSpriteMaterial) return heartSpriteMaterial;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96;
  const c = canvas.getContext("2d"); c.fillStyle = "#ff5f88"; c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 3; c.font = "74px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.strokeText("♥", 48, 51); c.fillText("♥", 48, 51);
  heartSpriteMaterial = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false });
  return heartSpriteMaterial;
}

function mateRejectionMaterial() {
  if (rejectionSpriteMaterial) return rejectionSpriteMaterial;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96;
  const c = canvas.getContext("2d"); c.fillStyle = "rgba(64,18,22,.88)"; c.beginPath(); c.arc(48, 48, 39, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#ff8a82"; c.lineWidth = 5; c.stroke(); c.fillStyle = "#fff1ef"; c.font = "bold 62px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("×", 48, 51);
  rejectionSpriteMaterial = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false });
  return rejectionSpriteMaterial;
}

function drawMapMarkers() {
  const cameraDistance = camera.position.distanceTo(controls.target);
  if (cameraDistance <= 110) return;
  if (cameraDistance <= 260) {
    const groupsById = new Map();
    for (const a of sim.animals) if (a.alive && a.groupId) { const group = groupsById.get(a.groupId) || { kind: a.speciesId, count: 0, x: 0, z: 0, goal: a.groupGoal || "travelling" }; group.count += 1; group.x += a.x; group.z += a.z; groupsById.set(a.groupId, group); }
    for (const [groupId, group] of groupsById) if (group.count >= 2) { const hunter = group.kind === "hunter", sprite = new THREE.Sprite(mapCountMaterial(hunter ? "hunter" : "herd", group.count, hunter ? "#bd6cff" : "#f1c84a")); sprite.position.set(group.x / group.count, terrainHeight(group.x / group.count, group.z / group.count) + 3.4, group.z / group.count); sprite.scale.set(5.8, 5.8, 1); sprite.userData.id = `group:${groupId}`; pickables.set(sprite.userData.id, sprite); groups.overlays.add(sprite); }
    // Ungrouped organisms are collapsed into neutral local totals. Group members
    // are deliberately excluded so every organism appears in exactly one marker.
    const soloBuckets = new Map(), soloSpan = Math.max(16, Math.ceil(WORLD / 15));
    for (const a of sim.animals) if (a.alive && !a.groupId) {
      const bx = Math.floor((a.x + HALF) / soloSpan), bz = Math.floor((a.z + HALF) / soloSpan), id = `${bx}:${bz}`;
      const bucket = soloBuckets.get(id) || { count: 0, x: 0, z: 0 };
      bucket.count += 1; bucket.x += a.x; bucket.z += a.z; soloBuckets.set(id, bucket);
    }
    for (const bucket of [...soloBuckets.values()].sort((a, b) => b.count - a.count).slice(0, 36)) {
      const x = bucket.x / bucket.count, z = bucket.z / bucket.count;
      const sprite = new THREE.Sprite(mapCountMaterial("solo", bucket.count, "#9aa3a0"));
      sprite.position.set(x, terrainHeight(x, z) + 3.25, z); sprite.scale.set(4.4, 4.4, 1); groups.overlays.add(sprite);
    }
    return;
  }
  // Far zoom is deliberately sparse: a maximum of eight regional population
  // totals, rather than a marker for every local patch or species.
  const buckets = new Map(), span = Math.max(48, Math.ceil(WORLD / 3));
  for (const a of sim.animals) if (a.alive) {
    const bx = Math.floor((a.x + HALF) / span), bz = Math.floor((a.z + HALF) / span), id = `${bx}:${bz}`;
    const b = buckets.get(id) || { count: 0, x: 0, z: 0 };
    b.count += 1; b.x += a.x; b.z += a.z; buckets.set(id, b);
  }
  for (const b of [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 8)) {
    const x = b.x / b.count, z = b.z / b.count;
    const sprite = new THREE.Sprite(mapCountMaterial("region", b.count, "#d9e8dc"));
    sprite.position.set(x, terrainHeight(x, z) + 3.4, z); sprite.scale.set(6.2, 6.2, 1); groups.overlays.add(sprite);
  }
}

function terrainRenderHeight(x, z) {
  return terrainHeight(x, z);
}

function buildTerrain() { return profiler.measure("terrain rebuild", buildTerrainWork); }
function buildTerrainWork() {
  clear(groups.terrain); clear(groups.water);
  const world = sim.hexWorld, positions = [], indices = [], vertexMap = new Map(), groupsByClass = [];
  const add = (x, z, height) => { x = clamp(x, -HALF, HALF); z = clamp(z, -HALF, HALF); const k = `${Math.round(x * 1000)},${Math.round(z * 1000)}`; if (vertexMap.has(k)) return vertexMap.get(k); const id = positions.length / 3; positions.push(x, height, z); vertexMap.set(k, id); return id; };
  for (const c of world.cells) {
    const centre = add(c.x, c.z, c.elevation), corners = world.corners(c).map((p) => add(p.x, p.z, world.lookup(p.x, p.z)?.elevation ?? c.elevation));
    // X/Z terrain uses the opposite winding from an XY polygon.  Keep these
    // faces upward so the one-sided land materials are lit and visible.
    const start = indices.length; for (let i = 0; i < 6; i++) indices.push(centre, corners[(i + 1) % 6], corners[i]);
    // Only a lake exposes a submerged basin bed. River ribbons cross the
    // ordinary local terrain instead of forcing brown mud beneath every flow.
    groupsByClass.push({ start, count: 18, materialIndex: c.waterBodyId?.startsWith("lake-") ? 5 : hexMaterialIndexAt(c.x, c.z) });
  }
  const groundGeo = new THREE.BufferGeometry();
  groundGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  groundGeo.setIndex(indices);
  for (const group of groupsByClass) groundGeo.addGroup(group.start, group.count, group.materialIndex);
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, hexTerrainMaterials);
  ground.userData.hexTerrain = true;
  groundColours = null;
  groups.terrain.add(ground);
  groundMesh = ground;
  terrainPickable = ground;
  // Lakes are joined, level surfaces. Their shared shoreline vertices remove
  // the former independent-hex water-cap effect.
  const lakePositions = [], lakeIndices = [], lakeVertices = new Map();
  const addLakeVertex = (x, y, z, lakeId) => { const k = `${lakeId}|${Math.round(x * 1000)},${Math.round(z * 1000)}`; if (lakeVertices.has(k)) return lakeVertices.get(k); const id = lakePositions.length / 3; lakePositions.push(x, y, z); lakeVertices.set(k, id); return id; };
  for (const lake of world.waterBodies || []) {
    const level = lake.level + .014;
    for (const c of lake.cells) { const centre = addLakeVertex(c.x, level, c.z, lake.id), corners = world.corners(c).map((p) => addLakeVertex(clamp(p.x, -HALF, HALF), level, clamp(p.z, -HALF, HALF), lake.id)); for (let i = 0; i < 6; i++) lakeIndices.push(centre, corners[i], corners[(i + 1) % 6]); }
  }
  if (lakePositions.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(lakePositions, 3)); geo.setIndex(lakeIndices); geo.computeVertexNormals(); groups.water.add(new THREE.Mesh(geo, mats.shallowWater)); }
  // Rivers are continuous downhill ribbons drawn over the existing terrain.
  // They are not separate six-sided water caps and never flatten a hillside.
  const riverPositions = [], riverIndices = [];
  const addRiverRun = (run) => {
    if (run.length < 2) return;
    const points = run.map((c) => ({ cell: c, x: c.x, z: c.z, y: (c.waterSurface ?? c.elevation) + .014, width: Math.max(.001, c.waterWidth || world.radius * .05) }));
    const last = points[points.length - 1], downstream = last.cell.flowTo;
    if (downstream?.channel && downstream.waterChannel) points.push({ cell: downstream, x: downstream.x, z: downstream.z, y: (downstream.waterSurface ?? downstream.elevation) + .014, width: Math.max(last.width, downstream.waterWidth || last.width) });
    else if (downstream?.cells && downstream.level > -Infinity) {
      const shore = downstream.spillInside || downstream.cells[0];
      points.push({ cell: shore, x: last.x + (shore.x - last.x) * .62, z: last.z + (shore.z - last.z) * .62, y: downstream.level + .013, width: last.width });
    }
    const left = [], right = [], miterLimit = world.riverWidthStats?.miterLimit || 2.5;
    for (let i = 0; i < points.length; i++) {
      const p = points[i], prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
      const inX = p.x - prev.x, inZ = p.z - prev.z, outX = next.x - p.x, outZ = next.z - p.z;
      const inL = Math.max(.0001, Math.hypot(inX, inZ)), outL = Math.max(.0001, Math.hypot(outX, outZ));
      const nxIn = -inZ / inL, nzIn = inX / inL, nxOut = -outZ / outL, nzOut = outX / outL;
      let mx = nxIn + nxOut, mz = nzIn + nzOut, ml = Math.hypot(mx, mz);
      if (ml < .0001) { mx = nxOut; mz = nzOut; ml = 1; } else { mx /= ml; mz /= ml; }
      const denom = Math.abs(mx * nxOut + mz * nzOut), ratio = 1 / Math.max(.001, denom);
      const half = p.width * .5, scale = ratio <= miterLimit ? half * ratio : half;
      const px = (ratio <= miterLimit ? mx : nxOut) * scale, pz = (ratio <= miterLimit ? mz : nzOut) * scale;
      left.push([p.x + px, p.y, p.z + pz]); right.push([p.x - px, p.y, p.z - pz]);
    }
    const base = riverPositions.length / 3;
    for (let i = 0; i < points.length; i++) riverPositions.push(...left[i], ...right[i]);
    for (let i = 0; i < points.length - 1; i++) { const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3; riverIndices.push(a, b, c, b, d, c); }
  };
  for (const route of world.riverRoutes || []) {
    let run = [];
    for (const cell of route.cells) { if (cell.waterChannel && cell.water) run.push(cell); else { addRiverRun(run); run = []; } }
    addRiverRun(run);
  }
  if (riverPositions.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(riverPositions, 3)); geo.setIndex(riverIndices); geo.computeVertexNormals(); groups.water.add(new THREE.Mesh(geo, mats.shallowWater)); }
  const edge = [];
  for (const [x, z] of [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF], [-HALF, -HALF]]) edge.push(x, terrainHeight(x, z) + 0.32, z);
  const edgeGeo = new THREE.BufferGeometry(); edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edge, 3));
  groups.terrain.add(new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({ color: 0x90bd7d, transparent: true, opacity: 0.6 })));
}
function drawAnimal(a) {
  const courting = (a.courtshipIconUntil || a.courtshipUntil || 0) > sim.tick;
  const rejecting = (a.mateRejectUntil || 0) > sim.tick;
  const emotion = emotionState(a);
  const attacking = (a.attackFlashUntil || 0) > sim.tick;
  const injured = (a.injuryFlashUntil || 0) > sim.tick || (a.injuries || []).length > 0;
  const signalKind = a.socialSignal?.until > sim.tick ? a.socialSignal.kind : "";
  const visualKey = `${a.speciesId}|${a.sex}|${a.lifeStage}|${Boolean(a.pregnant)}|${a.health < 45}|${courting}|${rejecting}|${attacking}|${injured}|${emotion}|${signalKind}`;
  const cached = animalRenderCache.get(a.id);
  if (cached?.userData.visualKey === visualKey) { const visual = visualState(a); cached.visible = true; poseOnTerrain(cached, visual); updateEntityIndicators(cached, a); pickables.set(a.id, cached.userData.pickMesh); if (selectedId === a.id) ringAt(a, 0.9, mats.selected); return; }
  if (cached) { groups.animals.remove(cached); animalRenderCache.delete(a.id); }
  const group = new THREE.Group();
  let head = null, tail = null;
  const scale = animalVisualScale(a);
  const bodyMat = animalMaterial(a);
  // Both silhouettes face local +Z. Group rotation then makes the head point
  // exactly along the organism's actual orientation.
  const body = new THREE.Mesh(geos.herbivore, bodyMat);
  body.scale.set(a.speciesId === "hunter" ? scale * 0.66 : scale * 0.76, a.speciesId === "hunter" ? scale * 0.34 : scale * 0.45, a.speciesId === "hunter" ? scale * 1.05 : scale * 0.78);
  body.position.y = a.speciesId === "hunter" ? 0.28 * scale : 0.38 * scale;
  body.userData.id = a.id;
  group.add(body);

  if (a.speciesId === "grazer") {
    // Round browsing body, distinct forward head and twin eyes: a tiny deer/cow silhouette.
    head = new THREE.Mesh(geos.herbivore, bodyMat);
    head.scale.set(0.43 * scale, 0.4 * scale, 0.45 * scale);
    head.position.set(0, 0.48 * scale, 0.5 * scale);
    group.add(head);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(geos.eye, mats.eye);
      eye.position.set(side * 0.14 * scale, 0.57 * scale, 0.79 * scale);
      group.add(eye);
    }
  } else {
    // Low hunter body, forward-pointing wedge muzzle and trailing tail make its direction unambiguous.
    const muzzle = new THREE.Mesh(geos.carnivore, bodyMat); head = muzzle;
    muzzle.rotation.x = Math.PI / 2;
    muzzle.scale.set(0.58 * scale, 0.72 * scale, 0.58 * scale);
    muzzle.position.set(0, 0.31 * scale, 0.72 * scale);
    group.add(muzzle);
    tail = new THREE.Mesh(geos.horn, bodyMat);
    tail.rotation.x = -Math.PI / 2;
    tail.scale.set(1.15 * scale, 1.35 * scale, 1.15 * scale);
    tail.position.set(0, 0.2 * scale, -0.82 * scale);
    group.add(tail);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(geos.eye, mats.eye);
      eye.position.set(side * 0.13 * scale, 0.43 * scale, 0.71 * scale);
      group.add(eye);
    }
  }

  // Sex is intentionally kept in the inspector rather than drawn above the
  // organism. At this scale a glyph/dot can be mistaken for thirst, tears or
  // an alert, while it is not essential to following behaviour in the world.

  if (a.lifeStage === "dependent" || a.lifeStage === "juvenile") {
    const youngMarker = new THREE.Mesh(geos.ring, mats.selected);
    youngMarker.rotation.x = -Math.PI / 2;
    youngMarker.scale.set(0.42 * scale, 0.42 * scale, 0.42 * scale);
    youngMarker.position.y = 0.04;
    group.add(youngMarker);
    if (a.lifeStage === "dependent") { const babyIcon = new THREE.Sprite(a.speciesId === "hunter" ? iconMaterials.infantHunter : iconMaterials.infantGrazer); babyIcon.position.set(-0.46 * scale, 1.65 * scale, 0); babyIcon.scale.set(0.46, 0.46, 0.46); group.add(babyIcon); }
  }

  if (a.pregnant) {
    const pregnancy = new THREE.Mesh(geos.ring, pregnancyMat);
    pregnancy.rotation.x = -Math.PI / 2;
    pregnancy.scale.set(0.68 * scale, 0.68 * scale, 0.68 * scale);
    pregnancy.position.y = 0.08;
    group.add(pregnancy);
    const pregnantIcon = new THREE.Sprite(a.speciesId === "hunter" ? iconMaterials.pregnantHunter : iconMaterials.pregnantGrazer);
    pregnantIcon.position.set(0.55 * scale, 1.75 * scale, 0);
    pregnantIcon.scale.set(0.62, 0.62, 0.62);
    group.add(pregnantIcon);
  }

  if (courting) {
    for (let i = 0; i < 2; i++) { const heart = new THREE.Sprite(courtshipHeartMaterial()); heart.position.set((i - 0.5) * 0.34, 1.75 * scale + i * 0.3, 0); heart.scale.set(0.42, 0.42, 0.42); group.add(heart); }
  }
  if (rejecting) { const icon = new THREE.Sprite(mateRejectionMaterial()); icon.position.set(0, 1.85 * scale, 0); icon.scale.set(0.38, 0.38, 0.38); group.add(icon); }
  if (attacking) {
    const strike = new THREE.Mesh(geos.ring, new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    strike.rotation.x = -Math.PI / 2; strike.scale.set(1.35 * scale, 1.35 * scale, 1.35 * scale); strike.position.y = 0.08; group.add(strike);
    const icon = new THREE.Sprite(attackMaterial()); icon.position.set(0.78 * scale, 2.12 * scale, 0); icon.scale.set(0.52, 0.52, 0.52); group.add(icon);
  }
  if (injured) {
    const wound = new THREE.Mesh(geos.ring, new THREE.MeshBasicMaterial({ color: 0xff7168, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    wound.rotation.x = -Math.PI / 2; wound.scale.set(1.12 * scale, 1.12 * scale, 1.12 * scale); wound.position.y = 0.065; group.add(wound);
    if ((a.injuryFlashUntil || 0) > sim.tick) { const icon = new THREE.Sprite(attackMaterial()); icon.position.set(0.76 * scale, 2.08 * scale, 0); icon.scale.set(0.4, 0.4, 0.4); group.add(icon); }
  }
  if (signalKind && !(signalKind === "courtship" && courting)) {
    const status = new THREE.Sprite(socialSignalMaterial(signalKind));
    status.position.set(-0.48 * scale, 1.92 * scale, 0);
    status.scale.set(0.46, 0.46, 0.46);
    group.add(status);
  }

  const icon = new THREE.Sprite(emotionFaceMaterial(emotion, a.speciesId));
  icon.position.set(0, 1.35 * scale, 0);
  icon.scale.set(0.72, 0.72, 0.72);
  group.add(icon);

  const visual = visualState(a);
  poseOnTerrain(group, visual);
  group.userData.id = a.id;
  group.userData.pickMesh = body;
  group.userData.visualKey = visualKey;
  group.userData.parts = { body, head, tail };
  for (const part of Object.values(group.userData.parts)) if (part) part.userData.restTransform = { position: part.position.clone(), rotation: part.rotation.clone(), scale: part.scale.clone() };
  updateEntityIndicators(group, a);
  groups.animals.add(group);
  animalRenderCache.set(a.id, group);
  pickables.set(a.id, body);
  if (selectedId === a.id) ringAt(a, 0.9, mats.selected);
}

function animalMaterial(a) {
  if (a.lifeStage === "dependent") return mats.newborn;
  if (a.lifeStage === "juvenile") return mats.juvenile;
  if (a.lifeStage === "old") return mats.oldAnimal;
  if (a.speciesId === "hunter") return a.sex === "M" ? mats.carnivoreMale : mats.carnivoreFemale;
  return a.sex === "M" ? mats.herbivoreMale : mats.herbivoreFemale;
}

function animalVisualScale(a) {
  const base = bodyScale(species[a.speciesId], a.age);
  const stage = a.lifeStage === "dependent" ? 0.55 : a.lifeStage === "juvenile" ? 0.72 : a.lifeStage === "subadult" ? 0.88 : a.lifeStage === "old" ? 0.92 : 1;
  const sex = a.sex === "M" && a.lifeStage !== "dependent" ? 1.08 : 1;
  const health = a.health < 45 ? 0.86 : 1;
  return base * stage * sex * health * (a.sizeTrait || 1);
}

function selectedAnimal() { return sim.animals.find((a) => a.id === selectedId && a.alive) || null; }
function selectedGroupMembers() { return selectedGroupId ? sim.animals.filter((a) => a.alive && a.groupId === selectedGroupId) : []; }
function focusGroup(groupId) {
  const members = sim.animals.filter((a) => a.alive && a.groupId === groupId);
  if (!members.length) return;
  const x = members.reduce((sum, a) => sum + a.x, 0) / members.length;
  const z = members.reduce((sum, a) => sum + a.z, 0) / members.length;
  const y = terrainHeight(x, z);
  selectedId = null; selectedGroupId = groupId; selectedTerrain = null; entityLocked = false;
  controls.target.set(x, y, z);
  camera.position.set(x + 92, y + 106, z + 92);
  ui.realityPanel.hidden = true;
  landscapeDirty = true; renderAll(); updateUI();
}
function focusMember(id) {
  const member = animalById(id);
  if (!member?.alive) return;
  selectedId = member.id; selectedGroupId = null; selectedTerrain = null; entityLocked = false;
  const y = terrainHeight(member.x, member.z);
  controls.target.set(member.x, y, member.z);
  camera.position.set(member.x + 56, y + 68, member.z + 56);
  landscapeDirty = true; renderAll(); updateUI();
}
function selectedCorpse() { return sim.corpses.find((c) => c.id === selectedId) || null; }
function reproductionFocused(a) { return Boolean(a && (a.drive === "reproduction" || (a.courtshipUntil || 0) > sim.tick || /mate|courtship|rejected/.test(a.currentAction || ""))); }
function drawReproductiveHighlights() {
  const selected = selectedAnimal();
  if (!selected) return;
  const linked = new Map();
  if (reproductionFocused(selected) && selected.actionTarget) { const target = animalById(selected.actionTarget); if (target?.alive) linked.set(target.id, target); }
  for (const other of sim.animals) if (other.alive && other.actionTarget === selected.id && reproductionFocused(other)) linked.set(other.id, other);
  for (const partner of linked.values()) ringAt(partner, 1.25, mateLinkMat);
}
function awarenessRange(a) { return Math.max(3, Math.round((species[a.speciesId].vision + species[a.speciesId].smell + species[a.speciesId].hearing) / 3 * (a.capabilities?.perceptionScale || 1))); }
function selectObject(e) { const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, camera); const hits = raycaster.intersectObjects([...pickables.values()], false), hadEntity = Boolean(selectedAnimal() || selectedGroupId); if (hits.length) { const clickedId = hits[0].object.userData.id; if (String(clickedId).startsWith("group:")) { selectedGroupId = clickedId.slice(6); selectedId = null; selectedTerrain = null; } else if (selectedId === clickedId && !entityLocked) selectedId = null; else { selectedId = clickedId; selectedGroupId = null; selectedTerrain = null; } } else if (!entityLocked) { selectedId = null; selectedGroupId = null; selectedTerrain = null; if (!hadEntity) { const groundHit = terrainPickable ? raycaster.intersectObject(terrainPickable, false)[0] : null; if (groundHit) { const x = Math.round(groundHit.point.x), z = Math.round(groundHit.point.z); selectedTerrain = inside(x, z) ? { x, z } : null; } } } landscapeDirty = true; renderAll(); updateUI(); }
function followSelected() {
  if (!entityLocked) return;
  const a = selectedAnimal();
  if (a) {
    const visual = visualState(a);
    return controls.target.lerp(new THREE.Vector3(visual.x, terrainHeight(visual.x, visual.z), visual.z), 0.08);
  }
  const group = selectedGroupMembers();
  if (!group.length) return;
  const visuals = group.map((member) => visualState(member));
  const x = visuals.reduce((sum, visual) => sum + visual.x, 0) / visuals.length;
  const z = visuals.reduce((sum, visual) => sum + visual.z, 0) / visuals.length;
  controls.target.lerp(new THREE.Vector3(x, terrainHeight(x, z), z), 0.08);
}
function resetCamera() { camera.position.set(175, 230, 190); controls.target.set(0, 0, 0); }
function clearEntityPresentation() { clear(groups.intent); animalRenderCache.clear(); entityThoughtStates.clear(); entityPresentationCache.clear(); entityIntentCache.clear(); entityMotionHistory.clear(); }
function readLocalList(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function writeLocalList(key, items) { try { localStorage.setItem(key, JSON.stringify(items)); } catch { addEvent("Browser storage is unavailable"); } }
function snapshotWorld() { const snapshot = { ...sim, animals: sim.animals.map(({ visualMove, ...animal }) => animal), worldSchema: WORLD_SCHEMA, savedAt: new Date().toISOString() }; delete snapshot.occupied; delete snapshot.entityIndex; delete snapshot.hexWorld; delete snapshot.cells; return snapshot; }
function openProgressDb() { return new Promise((resolve, reject) => { if (!window.indexedDB) return reject(new Error("IndexedDB unavailable")); const request = indexedDB.open(AUTOSAVE_DB, 1); request.onupgradeneeded = () => request.result.createObjectStore(AUTOSAVE_STORE); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function writeSnapshot(slot, snapshot = snapshotWorld()) { const db = await openProgressDb(); return new Promise((resolve, reject) => { const tx = db.transaction(AUTOSAVE_STORE, "readwrite"); tx.objectStore(AUTOSAVE_STORE).put(snapshot, slot); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
async function deleteSnapshot(slot) { const db = await openProgressDb(); return new Promise((resolve, reject) => { const tx = db.transaction(AUTOSAVE_STORE, "readwrite"); tx.objectStore(AUTOSAVE_STORE).delete(slot); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
async function readSnapshot(slot) { const db = await openProgressDb(); return new Promise((resolve, reject) => { const tx = db.transaction(AUTOSAVE_STORE, "readonly"); const request = tx.objectStore(AUTOSAVE_STORE).get(slot); request.onsuccess = () => { db.close(); resolve(request.result); }; request.onerror = () => { db.close(); reject(request.error); }; }); }
function activateSnapshot(snapshot, label) {
  if (!snapshot?.animals || !Number.isFinite(snapshot.seed)) throw new Error("not a valid world save");
  if (snapshot.worldSchema !== WORLD_SCHEMA) throw new Error("This save uses the retired square-world format and cannot be loaded into the hex-world redesign.");
  sim = { ...createWorld(snapshot.seed, snapshot.worldSetup || worldSetup), ...snapshot }; sim.worldSchema = WORLD_SCHEMA; sim.worldSetup = { ...worldSetup }; sim.activeScent ||= {}; sim.weatherSystems ||= [];
  syncWorldSetupInputs();
  enforceWorldBoundary(); sim.occupied = new Map(sim.animals.filter((a) => a.alive).map((a) => [key(a), a.id])); buildEntityIndex();
  clear(groups.terrain); clear(groups.plants); clear(groups.water); clear(groups.animals); clear(groups.corpses); clear(groups.fog); clear(groups.overlays); clearEntityPresentation(); fogCacheKey = ""; landscapeDirty = true; selectedId = null; selectedTerrain = null; entityLocked = false;
  buildTerrain(); addEvent(label); renderAll(); updateUI();
}
async function saveProgress(silent = false) { try { await writeSnapshot("resume"); if (!silent) { addEvent("Quick save created"); updateUI(); } } catch { if (!silent) { addEvent("Quick save failed: browser storage is full or unavailable"); updateUI(); } } }
async function restoreAutosavedProgress(manual = false) { const slot = new URLSearchParams(window.location.search).get("slot"); if (!manual && slot) return loadSlotByName(slot); try { let snapshot = await readSnapshot("resume"); if (!snapshot) { const legacy = localStorage.getItem(SAVE_KEY); if (legacy) snapshot = JSON.parse(legacy); } if (!snapshot) { if (manual) addEvent("No quick save exists yet"); return; } activateSnapshot(snapshot, manual ? "Quick save loaded" : "Resumed previous simulation"); } catch { if (manual) { addEvent("Quick load failed: saved world is invalid or incomplete"); updateUI(); } } }
function savedSlotMetadata() { return readLocalList(SAVE_SLOTS_KEY).map((slot) => typeof slot === "string" ? { name: slot, seed: "unknown", day: "?", savedAt: "" } : slot); }
async function saveNamedSlot() { const slots = savedSlotMetadata(); const name = window.prompt("Name this save", `World day ${sim.day}`)?.trim(); if (!name) return; try { await writeSnapshot(`slot:${name}`); const entry = { name, seed: sim.seed, day: sim.day, savedAt: new Date().toLocaleString() }; writeLocalList(SAVE_SLOTS_KEY, [entry, ...slots.filter((x) => x.name !== name)].slice(0, 12)); addEvent(`Saved slot: ${name} (seed ${sim.seed})`); updateUI(); } catch { addEvent("Save slot failed: browser storage is full or unavailable"); updateUI(); } }
async function loadNamedSlot() { const slots = savedSlotMetadata(); if (!slots.length) { addEvent("No named save slots yet"); updateUI(); return; } const name = window.prompt(`Choose a save name\n${slots.map((x) => `${x.name} — seed ${x.seed}, day ${x.day}`).join("\n")}`)?.trim(); if (name) loadSlotByName(name); }
async function loadSlotByName(name) { try { const snapshot = await readSnapshot(`slot:${name}`); if (!snapshot) { addEvent(`No save slot named “${name}”`); updateUI(); return; } activateSnapshot(snapshot, `Loaded slot: ${name} (seed ${snapshot.seed})`); } catch { addEvent("Load slot failed"); updateUI(); } }
async function deleteNamedSlot(name) { if (!window.confirm(`Delete the save “${name}”? This cannot be undone.`)) return; try { await deleteSnapshot(`slot:${name}`); writeLocalList(SAVE_SLOTS_KEY, savedSlotMetadata().filter((slot) => slot.name !== name)); addEvent(`Deleted save slot: ${name}`); updateUI(); } catch { addEvent("Could not delete that save slot"); updateUI(); } }
function exportProgress() { try { const blob = new Blob([JSON.stringify(snapshotWorld())], { type: "application/json" }); const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `rss-living-laboratory-day-${sim.day}-seed-${sim.seed}.json`; link.click(); URL.revokeObjectURL(url); addEvent("Save file exported"); updateUI(); } catch { addEvent("Export failed"); updateUI(); } }
function exportSlotShortcut() { const slots = savedSlotMetadata(); if (!slots.length) { addEvent("Create a named save slot before exporting its game shortcut"); updateUI(); return; } const name = window.prompt(`Shortcut for which save?\n${slots.map((slot) => `${slot.name} — seed ${slot.seed}, day ${slot.day}`).join("\n")}`, slots[0].name)?.trim(); if (!name || !slots.some((slot) => slot.name === name)) return; const base = `${window.location.protocol}//${window.location.host}${window.location.pathname}`; const blob = new Blob([`[InternetShortcut]\nURL=${base}?slot=${encodeURIComponent(name)}\n`], { type: "text/url" }); const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `${name.replace(/[^a-z0-9_-]+/gi, "-")}-rss-save.url`; link.click(); URL.revokeObjectURL(url); addEvent(`Game shortcut exported for ${name}`); updateUI(); }
function importProgress(event) { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { activateSnapshot(JSON.parse(reader.result), `Imported save: ${file.name}`); } catch { addEvent("Import failed: that file is not a compatible simulation save"); updateUI(); } }; reader.readAsText(file); }
function loadSeedWorld(seed, setup = worldSetup) { sim = createWorld(seed, setup); clear(groups.terrain); buildTerrain(); clear(groups.animals); clear(groups.fog); clearEntityPresentation(); fogCacheKey = ""; landscapeDirty = true; selectedId = null; selectedTerrain = null; entityLocked = false; running = true; ui.playPause.textContent = "Pause"; ui.runState.textContent = "Running"; resetCamera(); addEvent(`Generated world seed ${seed}`); renderAll(); updateUI(); }
function dominantDrive(a) { const vals = [["hunger", 100 - a.energy], ["thirst", 100 - a.hydration], ["fear", a.fear], ["fatigue", a.fatigue], ["reproduction", reproductionDrive(a)]]; vals.sort((x, y) => y[1] - x[1]); return vals[0][0]; }
function relationText(a) { const parts = []; if (a.motherId) parts.push(`dependent of ${a.motherId}`); if (a.caregiverIds?.length) parts.push(`adults: ${a.caregiverIds.join(", ")}`); if (a.offspringIds.length) parts.push(`${a.offspringIds.length} offspring`); if (a.groupId) parts.push(`${a.groupId}${a.groupGoal ? ` — ${a.groupGoal}` : ""}`); return parts.join("; ") || "none"; }
function mateHistoryText(a) { const entries = (a.mateHistory || []).slice(0, 3); return entries.length ? entries.map((entry) => `${entry.status} with ${entry.partnerId} (day ${entry.day})`).join("; ") : "no mating history"; }
function addEvent(text) { sim.events.push(`Day ${sim.day}: ${text}`); if (sim.events.length > 80) sim.events.shift(); }

function remember(a, m) { const old = a.memories.find((x) => x.type === m.type && x.x === m.x && x.z === m.z && x.targetId === m.targetId); if (old) Object.assign(old, m); else a.memories.push({ ...m }); if ((m.type === "food" || m.type === "water") && m.confidence > 0.38) { a.longMemory ||= []; const bearing = Math.atan2(m.z - a.z, m.x - a.x); const distanceBand = manhattan(a, m) < 5 ? "near" : manhattan(a, m) < 14 ? "moderate" : "far"; const lm = a.longMemory.find((x) => x.type === m.type); const vague = { type: m.type, bearing, distanceBand, confidence: m.confidence * 0.78, age: 0, learnedFrom: m.communicatedBy || m.channel }; if (lm) Object.assign(lm, vague); else a.longMemory.push(vague); } }
function nearestMemory(a, type) { return a.memories.filter((m) => m.type === type).sort((p, q) => manhattan(a, p) - manhattan(a, q))[0]; }
function nearbyCells(a, range) { const cells = []; const r = Math.ceil(range); for (let z = Math.max(-HALF, a.z - r); z < Math.min(HALF, a.z + r + 1); z++) for (let x = Math.max(-HALF, a.x - r); x < Math.min(HALF, a.x + r + 1); x++) if (Math.abs(x - a.x) + Math.abs(z - a.z) <= range) cells.push(cellAt(x, z)); return cells; }
function validMoves(a) { return neighbors(a).filter((p) => { const c = inside(p.x, p.z) ? cellAt(p.x, p.z) : null; return c && !(c.waterDepth > 0.45) && c.plantType !== "tree" && ((p.x === a.x && p.z === a.z) || !sim.occupied?.has(key(p))); }); }
function enforceWorldBoundary() {
  if (!sim?.animals) return;
  const lo = -HALF, hi = HALF, visualLo = lo + 0.2, visualHi = hi - 0.2;
  for (const a of sim.animals) {
    if (!a.alive) continue;
    a.x = clamp(a.x, lo, hi); a.z = clamp(a.z, lo, hi);
    a.fx = clamp(Number.isFinite(a.fx) ? a.fx : a.x, visualLo, visualHi);
    a.fz = clamp(Number.isFinite(a.fz) ? a.fz : a.z, visualLo, visualHi);
    if (a.motionTarget && !inside(a.motionTarget.x, a.motionTarget.z)) a.motionTarget = null;
  }
}
function nearestFree(a) { return validMoves(a)[0] || { x: a.x, z: a.z }; }
function drinkableSource(a) { return neighbors(a).filter((p) => inside(p.x, p.z)).map((p) => cellAt(p.x, p.z)).find((c) => c.waterDepth > 0) || null; }
function nearWater(a, r) { return Boolean(drinkableSource(a)); }
function randomLandCell(rng, occupied) { for (let i = 0; i < 1000; i++) { const p = { x: Math.floor(rng() * WORLD) - HALF, z: Math.floor(rng() * WORLD) - HALF }; if (!occupied.has(key(p))) { occupied.add(key(p)); return p; } } return { x: 0, z: 0 }; }
function cellAt(x, z) { return sim?.hexWorld?.lookup(x, z) || null; }
function neighbors(p) { const step = Math.max(0.75, (sim?.hexWorld?.radius || 1) * 0.65); return [0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3, Math.PI * 5 / 3].map((angle) => ({ x: p.x + Math.cos(angle) * step, z: p.z + Math.sin(angle) * step })).concat({ x: p.x, z: p.z }); }
function inside(x, z) { return x >= -HALF && x < HALF && z >= -HALF && z < HALF; }
function key(p) { const unit = Math.max(.5, (sim?.hexWorld?.radius || 1) * .45); return `${Math.round(p.x / unit)},${Math.round(p.z / unit)}`; }
function exploreKey(p) { return `${Math.floor((p.x + HALF) / 4)},${Math.floor((p.z + HALF) / 4)}`; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function focusVisionMultiplier(a) { return (a.stationaryTicks || 0) >= 9 ? 3 : (a.stationaryTicks || 0) >= 3 ? 2 : 1; }
function visionFovFor(a) { return a.speciesId === "hunter" ? Math.PI * 0.40 : VISION_FOV; }
function visionRangeFor(a) { const s = species[a.speciesId]; const hunterRange = a.speciesId === "hunter" ? 1.3 : 1; return Math.max(2, Math.round(s.vision * hunterRange * (a.lifeStage === "dependent" ? 0.55 : 1) * (a.capabilities?.perceptionScale || 1) * focusVisionMultiplier(a))); }
function hearingRangeFor(a) { const s = species[a.speciesId]; const speciesHearing = a.speciesId === "hunter" ? 0.10 : 0.50; return Math.max(2, Math.round(s.vision * 10 * speciesHearing * (a.lifeStage === "dependent" ? 0.55 : 1) * (a.capabilities?.perceptionScale || 1))); }
function hearingAccuracyFor(a, distance, range = hearingRangeFor(a)) {
  const distanceAccuracy = Math.pow(0.5, distance / Math.max(1, range * 0.5));
  const stillnessBoost = (a.stationaryTicks || 0) >= 2 ? 5 : 1;
  return clamp(distanceAccuracy * stillnessBoost, 0.025, 1);
}
function withinVision(a, target, range) { if (dist(a, target) > range) return false; const bearing = Math.atan2(target.z - a.z, target.x - a.x), delta = Math.atan2(Math.sin(bearing - (a.orientation || 0)), Math.cos(bearing - (a.orientation || 0))); return Math.abs(delta) <= visionFovFor(a) / 2; }
function animalVisibilityQuality(viewer, target, range) {
  const cell = cellAt(target.x, target.z);
  const d = dist(viewer, target);
  if (!cell) return 1;
  // Long grass conceals a stationary or slow target from afar, but not at
  // close range. Woodland remains the stronger line-of-sight blocker.
  const longGrassCover = clamp((cell.grassHeight || 0) - 0.52, 0, 0.48);
  const closeRecovery = clamp(1 - d / Math.max(1, range * 0.58), 0, 1);
  const partialTreeCover = partialTreeCoverAlong(viewer, target) ? 0.5 : 1;
  const shrubCover = cell?.shrubland || cell?.plantType === "shrub" ? (0.32 * (1 - closeRecovery)) : 0;
  const canopyCover = clamp((cell?.canopyCover || 0) * .46 * (1 - closeRecovery), 0, .46);
  return clamp((1 - longGrassCover * (1 - closeRecovery) - shrubCover - canopyCover + (target.movementNoise || 0) * 0.12) * partialTreeCover, 0.18, 1);
}
function leaflessTree(cell) { return Boolean(cell?.plantType === "tree" && !(cell?.fallenTreeUntil > sim.tick) && ((cell?.leaflessTreeUntil || 0) > sim.tick || sim.season === "Winter")); }
function partialTreeCover(cell) { return Boolean(cell?.fallenTreeUntil > sim.tick || leaflessTree(cell)); }
function partialTreeCoverAlong(viewer, target) {
  const steps = Math.ceil(dist(viewer, target));
  for (let i = 0; i <= steps; i++) {
    const c = cellAt(Math.round(viewer.x + (target.x - viewer.x) * i / Math.max(1, steps)), Math.round(viewer.z + (target.z - viewer.z) * i / Math.max(1, steps)));
    if (partialTreeCover(c)) return true;
  }
  return false;
}
function safeCoverFor(a) {
  const cell = cellAt(a.x, a.z);
  if (!cell) return 0;
  const terrainCover = cell.woodland && cell.plantType === "tree" ? (partialTreeCover(cell) ? 0.39 : 0.78) : cell.plantType === "shrub" ? 0.42 : (cell.grassHeight || 0) > 0.68 ? 0.34 : cell.rocky ? 0.1 : 0;
  const valleyCover = clamp(valleyDepth(a.x, a.z) / 11, 0, 0.3);
  const nearbyGroup = a.groupId ? nearbyAnimals(a, 3).filter((other) => other.alive && other.speciesId === a.speciesId && other.groupId === a.groupId).length : 0;
  return clamp(terrainCover + valleyCover + Math.min(0.28, nearbyGroup * 0.09), 0, 1);
}
function hasVisualLine(viewer, target, range) {
  if (!withinVision(viewer, target, range)) return false;
  const targetCell = cellAt(target.x, target.z);
  if (targetCell?.plantType === "tree" && !partialTreeCover(targetCell) && dist(viewer, target) > range * 0.5) return false;
  const steps = Math.ceil(dist(viewer, target));
  for (let i = 1; i < steps; i++) {
    const c = cellAt(Math.round(viewer.x + (target.x - viewer.x) * i / steps), Math.round(viewer.z + (target.z - viewer.z) * i / steps));
    if (c?.plantType === "tree" && !partialTreeCover(c)) return false;
    // Dense scrub does not make targets vanish, but it degrades a distant
    // sight contact.  That quality reduction is applied above rather than
    // leaking exact hidden positions into perception.
  }
  return true;
}
function hasMapVision(viewer, target, range) {
  if (!withinVision(viewer, target, range)) return false;
  const targetCell = cellAt(target.x, target.z);
  if (targetCell?.plantType === "tree" && !partialTreeCover(targetCell) && dist(viewer, target) > range * 0.5) return false;
  const steps = Math.ceil(dist(viewer, target));
  for (let i = 1; i < steps; i++) {
    const c = cellAt(Math.round(viewer.x + (target.x - viewer.x) * i / steps), Math.round(viewer.z + (target.z - viewer.z) * i / steps));
    if (c?.plantType === "tree" && !partialTreeCover(c)) return false;
  }
  return true;
}
function canSeeAnimal(viewer, target, range) {
  return hasVisualLine(viewer, target, range);
}
function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.z - b.z); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand() { sim.rngState = (sim.rngState + 0x6d2b79f5) | 0; let t = sim.rngState; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function clear(group) {
  while (group.children.length) {
    const child = group.children[0];
    // Instanced meshes own GPU instance buffers even when their geometry/material
    // are shared. Dispose those buffers before replacing a visual projection.
    child.traverse?.((node) => { if (node.isInstancedMesh) node.dispose?.(); });
    group.remove(child);
  }
}
function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
function resize() { const { clientWidth, clientHeight } = ui.viewport; camera.aspect = clientWidth / clientHeight; camera.updateProjectionMatrix(); renderer.setSize(clientWidth, clientHeight); }



function updateScentFields(elapsed = 1) {
  sim.activeScent ||= {};
  const windLoss = Math.pow(0.5, elapsed / 18) * Math.pow(1 - sim.weather.wind * 0.08, elapsed);
  for (const k of Object.keys(sim.activeScent)) { const [x, z] = k.split(",").map(Number), c = cellAt(x, z); if (!c?.scent) { delete sim.activeScent[k]; continue; } c.scent.grazer *= windLoss; c.scent.hunter *= windLoss; if (Math.max(c.scent.grazer, c.scent.hunter) < 0.04) { c.scent = null; delete sim.activeScent[k]; } }
  for (const a of sim.animals) {
    if (!a.alive) continue;
    const c = cellAt(a.x, a.z);
    if (!c.scent) c.scent = { grazer: 0, hunter: 0 };
    c.scent[a.speciesId] = clamp(c.scent[a.speciesId] + 0.7 * elapsed, 0, 5);
    sim.activeScent[key(c)] = 1;
  }
}

function computeCapabilities(a, s) {
  const ageFactor = a.lifeStage === "dependent" ? 0.42 : a.lifeStage === "juvenile" ? 0.65 : a.lifeStage === "subadult" ? 0.84 : a.lifeStage === "old" ? 0.72 : 1;
  const fatigueFactor = clamp(1 - a.fatigue / 160, 0.35, 1);
  const injuryFactor = (a.injuries || []).reduce((v, i) => v * (1 - i.severity * 0.35), 1);
  const pregnancyFactor = a.pregnant ? 0.82 : 1;
  const fullnessFactor = a.stomach >= 94 ? 0.28 : a.stomach >= 82 ? 0.55 : a.stomach >= 68 ? 0.78 : 1;
  const traumaSpeedFactor = (a.healthCap || 100) <= 60 ? 0.375 : (a.healthCap || 100) <= 75 ? 0.75 : 1;
  return {
    speed: (s.speed || 1) * ageFactor * fatigueFactor * injuryFactor * pregnancyFactor * fullnessFactor * traumaSpeedFactor,
    canSprint: ageFactor > 0.55 && a.fatigue < 78 && injuryFactor > 0.55,
    canMate: mature(a) && !a.pregnant && !a.conception && a.energy > s.reproductionEnergy && a.health > 58 && (a.sex !== "F" || fertilityCycle(a).fertile),
    canHunt: a.speciesId === "hunter" && ageFactor > 0.6 && a.energy > 12 && a.stomach < 72,
    recovery: a.lifeStage === "old" ? 1.25 : a.lifeStage === "dependent" ? 2.8 : 2.2,
    perceptionScale: clamp(ageFactor * injuryFactor, 0.35, 1)
  };
}

function updateTrauma(a) {
  a.healthCap ??= 100;
  // These are permanent threshold scars.  Healing can restore health only up
  // to the best cap the animal retained before being critically hurt.
  if (a.health < 25 && a.healthCap > 60) a.healthCap = 60;
  else if (a.health < 50 && a.healthCap > 75) a.healthCap = 75;
  a.health = Math.min(a.health, a.healthCap);
}

function updateInjuries(a) {
  if (!a.injuries) a.injuries = [];
  for (const injury of a.injuries) {
    injury.severity -= (a.energy > 45 ? 0.003 : 0.001) * (a.lifeStage === "old" ? 0.45 : 1);
    a.health -= Math.max(0, injury.severity - 0.75) * 0.01;
  }
  a.injuries = a.injuries.filter((i) => i.severity > 0.05);
}

function strikeAnimal(attacker, target, damage, type = "bite") {
  attacker.attackFlashUntil = sim.tick + 14;
  attacker.lastAttack = { targetId: target.id, damage: Math.round(damage), type, tick: sim.tick };
  target.health = Math.max(0, target.health - damage);
  updateTrauma(target);
  target.fear = 100;
  target.injuryFlashUntil = sim.tick + 22;
  target.lastHit = { attackerId: attacker.id, damage: Math.round(damage), type, tick: sim.tick };
  target.injuries ||= [];
  target.injuries.push({ type, severity: clamp(0.35 + damage / 75, 0.35, 0.9), age: 0, sourceId: attacker.id });
  addEvent(`${attacker.id} struck ${target.id}: −${Math.round(damage)} health`);
}

function maybeInjure(a, chance, sourceId = null, type = "limb") {
  if (rand() > chance) return;
  if (!a.injuries) a.injuries = [];
  const damage = 5 + rand() * 10;
  a.injuries.push({ type, severity: 0.35 + rand() * 0.5, age: 0, sourceId });
  a.health -= damage;
  updateTrauma(a);
  a.injuryFlashUntil = sim.tick + 18;
  a.lastHit = { attackerId: sourceId, damage: Math.round(damage), type, tick: sim.tick };
  addEvent(`${a.id} was injured${sourceId ? ` by ${sourceId}` : ""}: −${Math.round(damage)} health`);
}

function plantStageFor(cell) {
  const type = plantTypes[cell.plantType];
  if (cell.biomass <= 0.02) return "dead";
  if (cell.plantAge < 2) return "seedling";
  if (cell.plantAge < 12) return "juvenile";
  if (cell.plantAge > (type.max || 1) * 300) return "senescent";
  return cell.biomass > (type.max || 1) * 0.72 ? "reproductive" : "mature";
}

function reseedCell(cell) {
  cell.plantType = cell.woodland ? (rand() > 0.3 ? "tree" : "shrub") : "grass";
  cell.plantAge = 0;
  cell.biomass = 0.08;
  cell.seedStore = 0;
  cell.plantStage = "seedling";
}

function disperseSeed(cell) {
  const options = nearbyCells(cell, 2).filter((c) => !c.water && !c.rocky && !c.sandy && c.biomass < 0.2);
  const target = options[Math.floor(rand() * options.length)];
  if (!target) return;
  target.plantType = target.woodland ? (cell.plantType === "grass" ? "shrub" : cell.plantType) : "grass";
  target.plantAge = 0;
  target.biomass = Math.max(target.biomass, 0.06);
  target.plantStage = "seedling";
  cell.seedStore = 0;
}

function addRelationship(sourceId, targetId, type, strength, dependency, duration) {
  if (!sim.relationships) sim.relationships = [];
  sim.relationships.push({ sourceId, targetId, type, strength, dependency, familiarity: 1, createdDay: sim.day, lastContact: sim.day, duration });
}

function removeRelationship(a, b, type) {
  if (!sim.relationships) return;
  sim.relationships = sim.relationships.filter((r) => !(r.type === type && ((r.sourceId === a && r.targetId === b) || (r.sourceId === b && r.targetId === a))));
}

function buildEntityIndex() {
  const cellSize = 12, buckets = new Map(), byId = new Map();
  for (const a of sim.animals) { if (!a.alive) continue; const k = `${Math.floor((a.x + HALF) / cellSize)},${Math.floor((a.z + HALF) / cellSize)}`; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(a); byId.set(a.id, a); }
  sim.entityIndex = { cellSize, buckets, byId };
}
function nearbyAnimals(a, range) { const index = sim.entityIndex; if (!index) return sim.animals; const radius = Math.ceil(range / index.cellSize), gx = Math.floor((a.x + HALF) / index.cellSize), gz = Math.floor((a.z + HALF) / index.cellSize), found = []; for (let z = gz - radius; z <= gz + radius; z++) for (let x = gx - radius; x <= gx + radius; x++) { const bucket = index.buckets.get(`${x},${z}`); if (bucket) found.push(...bucket); } return found; }
function animalById(id) { return sim.entityIndex?.byId.get(id) || sim.animals.find((a) => a.id === id); }







function plantQuality(c) {
  return (plantTypes[c.plantType].nutrition || 1) * clamp(c.biomass / plantTypes[c.plantType].max, 0.2, 1);
}

function memorySupport(a, type) {
  return a.memories.filter((m) => m.type === type && m.age < 40).reduce((sum, m) => sum + m.confidence, 0);
}

function herdBonus(a) {
  return (a.sensoryBuffer || []).filter((m) => m.type === "conspecific" && m.channel === "sight").length * 6;
}

function nearestConspecific(a) {
  const seen = (a.sensoryBuffer || []).filter((m) => m.type === "conspecific" && m.channel === "sight" && m.targetId).sort((p, q) => manhattan(a, p) - manhattan(a, q))[0];
  return seen ? animalById(seen.targetId) : undefined;
}

function vulnerability(a) {
  return clamp((100 - a.health) / 100 + a.fatigue / 130 + (a.lifeStage === "dependent" ? 0.55 : a.lifeStage === "old" ? 0.25 : 0), 0, 1.5);
}





function drawVegetationRegions(stride = 2, observer = null) {
  // The ecological grid remains invisible.  Presentation uses one connected
  // coloured ground mesh plus a sparse hex water skin and vegetation assets;
  // this removes the old stack of independently floating square tiles.
  const visionForHex = observer ? visionRangeFor(observer) : 0;
  // Water now renders through buildTerrain() as a normal terrain material.
  // Do not add a separate lake or stream mesh here: that caused the floating,
  // stepped water layer this renderer replaced.
  // Woodlands render as clustered plants, not a sparse scatter of single cones.
  // Trees favour mature, deep-soil cells; shrubs form denser edges and understory.
  const hexTrees = [], bareTrees = [], fallenTrees = [], hexBushes = [], variation = (x, z) => { const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return n - Math.floor(n); };
  const woodyStride = Math.max(2, stride * 2);
  for (let z = -HALF; z < HALF; z += woodyStride) for (let x = -HALF; x < HALF; x += woodyStride) {
    const c = cellAt(x, z); if (!(c?.woodland || c?.shrubland) || (observer && !hasMapVision(observer, c, visionForHex))) continue;
    const n = variation(x, z), matureTree = c.plantType === "tree" && c.soilDepth > 0.58 && c.moisture > 0.48;
    const hasTree = c.plantType === "tree" && (c.fallenTreeUntil > sim.tick || (matureTree && n > clamp(0.72 - (worldSetup.trees ?? 1) * 0.54, 0.04, 0.84)));
    if (hasTree && c.fallenTreeUntil > sim.tick) fallenTrees.push(c);
    else if (hasTree && leaflessTree(c)) bareTrees.push(c);
    else if (hasTree) hexTrees.push(c);
    // Every woody region receives several low shrubs, creating natural edges,
    // shelter and visually meaningful cover between the tree crowns.
    const hasBush = c.shrubland || (c.woodland && c.woodyStage !== "matureTree" && n > 0.54);
    if (hasBush && n > clamp(0.78 - (worldSetup.bushes ?? 1) * 0.46, 0.04, 0.86)) hexBushes.push({ ...c, sourceX: c.x, sourceZ: c.z, x: clamp(c.x + (variation(x + 4, z) - 0.5) * 1.35, -HALF + 0.8, HALF - 1.8), z: clamp(c.z + (variation(x, z + 9) - 0.5) * 1.35, -HALF + 0.8, HALF - 1.8) });
  }
  const drawHexWoody = (items, geo, material, scale, height, fallen = false) => {
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(geo, material, items.length), dummy = new THREE.Object3D();
    items.forEach((c, i) => {
      // Every transform is a pure function of its source terrain cell.  Rebuilds
      // can change the list order without making existing plants slide around.
      const sx = c.sourceX ?? c.x, sz = c.sourceZ ?? c.z;
      const offsetX = (variation(sx + 17, sz + 31) - 0.5) * 0.24, offsetZ = (variation(sx + 53, sz + 7) - 0.5) * 0.24;
      const yaw = variation(sx + 71, sz + 11) * Math.PI * 2, size = 0.82 + variation(sx + 29, sz + 47) * 0.24;
      dummy.position.set(c.x + offsetX, terrainHeight(c.x, c.z) + height, c.z + offsetZ);
      dummy.rotation.set(fallen ? Math.PI / 2 : 0, yaw, fallen ? Math.PI / 2 : 0);
      dummy.scale.set(scale, scale * size, scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; groups.plants.add(mesh);
  };
  drawHexWoody(hexBushes, geos.bush, mats.bushAsset, 0.92, 0.48);
  drawHexWoody(hexTrees, geos.tree, mats.treeAsset, 1.05, 1.25);
  drawHexWoody(hexTrees, geos.trunk, mats.trunk, 1, 0.42);
  drawHexWoody(bareTrees, geos.tree, mats.bareTree, 0.68, 1.08);
  drawHexWoody(bareTrees, geos.trunk, mats.trunk, 1, 0.42);
  drawHexWoody(fallenTrees, geos.fallenTree, mats.trunk, 1, 0.22, true);
  const lilies = sim.cells.filter((c) => c.water && !c.waterChannel && c.waterDepth > 0.025 && c.waterDepth <= 0.45 && c.temperature > 8 && c.shoreExposure < .62 && ((c.id * 17 + sim.seed) % 11 === 0));
  if (lilies.length) { const mesh = new THREE.InstancedMesh(geos.marker, mats.lily, lilies.length), dummy = new THREE.Object3D(); lilies.forEach((c, i) => { dummy.position.set(c.x, (c.waterSurface || c.elevation) + .045, c.z); dummy.scale.set(.9, .14, .9); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.instanceMatrix.needsUpdate = true; groups.plants.add(mesh); }
  return;
  // All visible terrain classes—including water—are batched square instances.
  const patches = { grass: [], longGrass: [], forest: [], dirt: [], sand: [], mud: [], wetland: [], rock: [], snow: [], water: [], lakeBedMud: [], lakeBedRock: [] };
  const entityVision = observer ? visionRangeFor(observer) : 0;
  for (let z = -HALF; z < HALF; z += stride) for (let x = -HALF; x < HALF; x += stride) {
    const c = cellAt(x, z);
    // Laboratory view can soften coarse water edges.  Entity view must never
    // borrow neighbouring water or render water outside current line of sight.
    const adjacentWater = !observer && stride > 1 ? neighbors(c).map((p) => inside(p.x, p.z) ? cellAt(p.x, p.z) : null).find((n) => n?.water) : null;
    const waterCell = c.water ? c : adjacentWater;
    const water = Boolean(waterCell) && (!observer || hasMapVision(observer, waterCell, entityVision));
    const kind = water ? "water" : c.terrainClass || vegetationKind(c);
    const coverage = kind === "grass" || kind === "longGrass" || kind === "forest" || kind === "shrubland" ? clamp(c.biomass / plantTypes[c.plantType].max, 0.16, 1) : 0.7;
    (patches[kind] || patches.dirt).push({ x, z, coverage, waterCell });
    // A water cell has both an excavated bed and a separate water surface.
    // This prevents the dark base mesh reading as an empty hole at low camera angles.
    if (c.water) (c.rocky ? patches.lakeBedRock : patches.lakeBedMud).push({ x, z, coverage });
  }
  const surfaceHeight = (x, z) => {
    const half = stride * 0.5;
    return Math.max(terrainHeight(x, z), terrainHeight(clamp(x - half, -HALF, HALF - 1), z), terrainHeight(clamp(x + half, -HALF, HALF - 1), z), terrainHeight(x, clamp(z - half, -HALF, HALF - 1)), terrainHeight(x, clamp(z + half, -HALF, HALF - 1))) + 0.07;
  };
  const draw = (patches, material, water = false) => { if (!patches.length) return; const mesh = new THREE.InstancedMesh(geos.terrainTile, material, patches.length), dummy = new THREE.Object3D(); patches.forEach((p, i) => { const scale = stride * 1.025; const y = water ? lakeSurfaceHeight(p.waterCell?.x ?? p.x, p.waterCell?.z ?? p.z) + 0.09 : surfaceHeight(p.x, p.z); dummy.position.set(p.x, y, p.z); dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.instanceMatrix.needsUpdate = true; (water ? groups.water : groups.plants).add(mesh); };
  const drawBed = (patches, material) => { if (!patches.length) return; const mesh = new THREE.InstancedMesh(geos.terrainTile, material, patches.length), dummy = new THREE.Object3D(); patches.forEach((p, i) => { const scale = stride * 1.02; dummy.position.set(p.x, terrainHeight(p.x, p.z) + 0.035, p.z); dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.instanceMatrix.needsUpdate = true; groups.plants.add(mesh); };
  drawBed(patches.lakeBedMud, mats.mudPatch); drawBed(patches.lakeBedRock, mats.rockPatch);
  draw(patches.grass, mats.grassPatch); draw(patches.longGrass, mats.longGrassPatch); draw(patches.forest, mats.forestPatch); draw(patches.dirt, mats.dirtPatch); draw(patches.sand, mats.sandPatch); draw(patches.mud, mats.mudPatch); draw(patches.wetland, mats.wetlandPatch); draw(patches.rock, mats.rockPatch); draw(patches.snow, mats.snowPatch);
  draw(patches.water, mats.water, true);
  // Woody cover is a separate, sparse instanced layer: shrubs are low cover
  // animals can enter; trees are tall obstacles and sight blockers.
  const trees = [], bushes = [];
  for (let z = -HALF; z < HALF; z += Math.max(2, stride * 2)) for (let x = -HALF; x < HALF; x += Math.max(2, stride * 2)) {
    const c = cellAt(x, z);
    if (!c?.woodland || (observer && !hasMapVision(observer, c, entityVision))) continue;
    (c.plantType === "tree" ? trees : bushes).push(c);
  }
  const drawWoody = (items, geo, material, scale, height) => { if (!items.length) return; const mesh = new THREE.InstancedMesh(geo, material, items.length), dummy = new THREE.Object3D(); items.forEach((c, i) => { dummy.position.set(c.x + (((i * 17) % 7) - 3) * 0.06, terrainHeight(c.x, c.z) + height, c.z + (((i * 11) % 7) - 3) * 0.06); dummy.rotation.y = (i * 2.4) % Math.PI; dummy.scale.set(scale, scale * (0.82 + (i % 4) * 0.08), scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.instanceMatrix.needsUpdate = true; groups.plants.add(mesh); };
  drawWoody(bushes, geos.bush, mats.bushAsset, 0.82 * stride, 0.42 * stride);
  drawWoody(trees, geos.tree, mats.treeAsset, 0.82 * stride, 0.75 * stride);
}

function vegetationKind(cell) {
  return cell.woodland ? "forest" : (cell.grassHeight || 0) > 0.68 ? "longGrass" : "grass";
}




function processDigestion(a) {
  if (!a.seedLoad) a.seedLoad = [];
  const digestion = a.stomach >= 94 ? 0.2 : a.stomach >= 82 ? 0.27 : a.stomach >= 68 ? 0.34 : 0.43;
  a.stomach = clamp(a.stomach - digestion, 0, 100);
  if (a.stomach >= 82) a.hydration = clamp(a.hydration - (a.stomach >= 94 ? 0.11 : 0.06), 0, 100);
  for (const seed of a.seedLoad) seed.age += 1;
  const ready = a.seedLoad.filter((seed) => seed.age > 18 && rand() < 0.08 * seed.viability);
  a.seedLoad = a.seedLoad.filter((seed) => seed.age <= 18 || !ready.includes(seed));
  for (const seed of ready) {
    const cell = cellAt(a.x, a.z);
    if (cell.water || cell.rocky || cell.sandy) continue;
    if (cell.biomass < 0.35 || rand() < 0.25) {
      cell.plantType = seed.plantType === "tree" && rand() < 0.65 ? "shrub" : seed.plantType;
      cell.plantAge = 0;
      cell.plantStage = "seedling";
      cell.biomass = Math.max(cell.biomass, 0.07);
      cell.seedStore = 0;
      cell.fertility = clamp(cell.fertility + 0.02, 0, 1);
    }
  }
}

function localFoodBonus(a) {
  const c = cellAt(a.x, a.z);
  return !c.water && (!c.woodland || c.plantType === "shrub") && !c.rocky && !c.sandy && c.biomass > 0.2 ? c.biomass * (c.plantType === "shrub" ? 27 : 35) : 0;
}




function seekWater(a) {
  const known = nearestMemory(a, "water");
  if (known) {
    if (manhattan(a, known) > 0) return moveToward(a, known, "seeking remembered water");
    return drink(a);
  }
  if (moveByLongMemory(a, "water", "travelling by vague long-term water memory")) return;
  socialWander(a, "searching for water without privileged coordinates");
}











function knownCarcass(a) {
  const contact = (a.sensoryBuffer || []).filter((m) => m.type === "carcass" && m.targetId && (m.channel === "sight" || manhattan(a, m) <= 1)).sort((p, q) => manhattan(a, p) - manhattan(a, q))[0];
  if (contact) return sim.corpses.find((c) => c.id === contact.targetId && c.biomass > 0);
  const memory = nearestMemory(a, "carcass");
  return memory && manhattan(a, memory) <= 1 ? sim.corpses.find((c) => c.id === memory.targetId && c.biomass > 0 && dist(a, c) <= 1.5) : null;
}

function scavenge(a) {
  const corpse = knownCarcass(a);
  if (!corpse) { const memory = nearestMemory(a, "carcass"); return memory ? moveToward(a, memory, "following remembered carcass scent") : hunt(a); }
  if (dist(a, corpse) > 1.2) return moveToward(a, corpse, "moving to carcass");
  const rivals = sim.animals.filter((o) => o.alive && o.speciesId === "hunter" && o.id !== a.id && dist(o, corpse) <= 1.5);
  const stronger = rivals.sort((p, q) => (q.bodyMass || 0) - (p.bodyMass || 0))[0];
  const urgent = carcassFamilyUrgency(a) + driveLevels(a).hunger;
  if (stronger && stronger.bodyMass > a.bodyMass * (0.9 + rand() * 0.25) && rand() > clamp(0.12 + urgent / 220 + a.aggression * 0.25, 0.12, 0.86)) {
    a.currentAction = `yielding carcass to ${stronger.id}`;
    if (rand() < 0.14 + urgent / 700) { maybeInjure(a, 0.7); maybeInjure(stronger, 0.25); addEvent(`${a.id} fought ${stronger.id} over ${corpse.sourceId}`); }
    return fleeFromPoint(a, corpse, "retreating from carcass contest");
  }
  corpse.ownerId = a.id;
  const meal = Math.min(corpse.biomass, 0.32 + a.bodyMass / 190);
  corpse.biomass -= meal;
  a.energy = clamp(a.energy + meal * 7.5, 0, 125);
  a.hydration = clamp(a.hydration + meal * 0.6, 0, 100);
  a.hydration = clamp(a.hydration - meal * 0.9, 0, 100);
  a.stomach = clamp(a.stomach + meal * 8, 0, 100);
  a.lastMealTick = sim.tick;
  a.fatigue = clamp(a.fatigue - 2, 0, 100);
  a.currentAction = rivals.length ? "feeding while guarding carcass" : "feeding from carcass";
}

function carcassFamilyUrgency(a) { return (a.offspringIds || []).reduce((score, id) => { const child = animalById(id); return score + (child?.alive && (child.energy < 55 || child.hydration < 45) ? 80 : 0); }, 0); }

function fleeFromPoint(a, point, label) { const moves = validMoves(a).sort((p, q) => manhattan(q, point) - manhattan(p, point)); applyMove(a, moves[0], label); }

function localPreyScentBonus(a) {
  return (a.sensoryBuffer || []).filter((m) => m.type === "preyTrail" && m.channel === "smell").reduce((best, m) => Math.max(best, m.confidence), 0) * 22;
}





function orientFlatToHeading(object, heading) {
  // q = yaw × lay-flat: local +X becomes (cos(heading), 0, sin(heading)).
  object.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -heading);
  object.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
}
function drawSelectedOverlays() {
  const a = selectedAnimal();
  if (!a) return;
  const visual = visualState(a), origin = new THREE.Vector3(visual.x, terrainHeight(visual.x, visual.z) + 0.45, visual.z);
  const heading = new THREE.Vector3(Math.cos(visual.orientation), 0, Math.sin(visual.orientation));
  // The white arrow is facing/attention. The coloured ground arrow maintained
  // by the presentation layer is intended travel, so reverse movement and
  // looking toward a threat while retreating remain visually distinct.
  const headingArrow = new THREE.ArrowHelper(heading, origin, 2.2, 0xf2f7f3, 0.52, 0.3);
  headingArrow.renderOrder = 35; groups.overlays.add(headingArrow);
  const range = visionRangeFor(a);
  if (ui.overlayPerception.checked) {
    const scale = a.capabilities?.perceptionScale || 1;
    const vision = new THREE.Mesh(visionGeometryFor(a), senseMats.vision);
    // CircleGeometry starts in its own XY plane facing local +X. Rotate the
    // plane down first, then turn it around local Z so +X maps to the same
    // X/Z heading used by movement, sight checks, and the body arrow.
    orientFlatToHeading(vision, visual.orientation);
    vision.scale.set(range, range, range);
    vision.position.set(visual.x, terrainHeight(visual.x, visual.z) + 0.15, visual.z);
    vision.renderOrder = 30;
    groups.overlays.add(vision);
    ringAt(a, Math.max(2, species[a.speciesId].smell * scale), senseMats.smell);
    const contacts = [...a.sensoryBuffer].filter((contact) => contact.channel !== "hearing").sort((p, q) => q.confidence - p.confidence).slice(0, 20);
    for (const contact of contacts) { const marker = new THREE.Mesh(geos.marker, contact.channel === "smell" ? senseMats.smellContact : senseMats.sightContact); marker.scale.set(1.9, 0.55, 1.9); marker.position.set(contact.x, terrainHeight(contact.x, contact.z) + 0.38, contact.z); marker.renderOrder = 30; groups.overlays.add(marker); }
  }
  if (ui.overlaySound.checked || ui.overlayCalls?.checked) {
    const hearingRange = hearingRangeFor(a);
    if (ui.overlaySound.checked) ringAt(a, hearingRange, senseMats.hearing);
    const heard = (a.sensoryBuffer || []).filter((m) => m.channel === "hearing" && ((ui.overlayCalls?.checked && (m.signalKind || m.communicatedBy)) || (ui.overlaySound.checked && !m.signalKind && !m.communicatedBy))).sort((p, q) => q.confidence - p.confidence).slice(0, 16);
    for (const sound of heard) {
      const understood = Boolean(sound.communicatedBy || sound.type === "water" || sound.type === "food" || sound.type === "predator" || sound.type === "preyTrail");
      const marker = new THREE.Mesh(geos.marker, understood ? communicationMat : senseMats.hearingContact);
      const certainty = clamp(sound.confidence || 0.2, 0.12, 1);
      marker.scale.set(0.8 + certainty * 2.6, 0.35 + certainty * 0.45, 0.8 + certainty * 2.6);
      marker.position.set(sound.x, terrainHeight(sound.x, sound.z) + 0.4, sound.z);
      marker.renderOrder = 30;
      groups.overlays.add(marker);
      if (sound.soundIdentity === "unknown") {
        const uncertainty = new THREE.Mesh(geos.marker, senseMats.hearingContact);
        uncertainty.scale.set(2.1 - certainty, 0.08, 2.1 - certainty);
        uncertainty.position.set(sound.x, terrainHeight(sound.x, sound.z) + 0.32, sound.z);
        uncertainty.renderOrder = 29;
        groups.overlays.add(uncertainty);
      }
      if (understood) ringAt(sound, 0.65 + certainty * 1.15, communicationMat);
    }
    if (ui.overlayCalls?.checked) for (const r of a.communicationReveals || []) {
      const certainty = r.noun ? 0.9 : 0.45;
      const marker = new THREE.Mesh(geos.memoryArrow, communicationMat);
      orientFlatToHeading(marker, Math.atan2(r.z - a.z, r.x - a.x));
      marker.scale.set(1 + certainty * 1.8, 1 + certainty * 1.8, 1 + certainty * 1.8);
      marker.position.set(r.x, terrainHeight(r.x, r.z) + 0.48, r.z);
      marker.renderOrder = 31;
      groups.overlays.add(marker);
    }
  }
  if (ui.overlayMemory.checked) {
    for (const m of Object.values(a.mapMemory || {})) {
      if (m.type !== "water") continue;
      const certainty = clamp((m.confidence ?? 1) * (1 - Math.max(0, sim.tick - (m.seenTick || sim.tick)) / 1800), 0.22, 1);
      const waterMemory = new THREE.Mesh(geos.memoryArrow, mats.water);
      const direction = Math.atan2(m.z - a.z, m.x - a.x);
      orientFlatToHeading(waterMemory, direction);
      const size = 1.1 + certainty * 2.6;
      waterMemory.scale.set(size, size, size);
      waterMemory.position.set(m.x, terrainHeight(m.x, m.z) + 0.5, m.z);
      waterMemory.material = mats.water.clone();
      waterMemory.material.opacity = 0.25 + certainty * 0.65;
      waterMemory.renderOrder = 30;
      groups.overlays.add(waterMemory);
    }
    // Short-term contacts remain available in the inspector and causal trace.
    // They no longer draw anonymous floor squares: those were a debug aid, but
    // visually implied non-existent water and obscured the actual entity view.
  }
  // Laboratory field overlays are deliberately explicit highlights.  The map
  // itself remains readable when they are off; enabling one now has a clear,
  // observable effect around the selected organism.
  // Entity view must never use a laboratory-sized inspection radius.  These
  // optional overlays can only highlight cells the selected animal can see.
  const fieldRange = Math.ceil(visionRangeFor(a));
  if (ui.overlayWater.checked || ui.overlayBiomass.checked) {
    for (let z = Math.floor(a.z - fieldRange); z <= Math.ceil(a.z + fieldRange); z += 2) for (let x = Math.floor(a.x - fieldRange); x <= Math.ceil(a.x + fieldRange); x += 2) {
      if (!inside(x, z) || !hasMapVision(a, { x, z }, fieldRange)) continue;
      const cell = cellAt(x, z), showWater = ui.overlayWater.checked && cell.water, showBiomass = ui.overlayBiomass.checked && !cell.water && cell.biomass > 0.34;
      if (!showWater && !showBiomass) continue;
      const marker = new THREE.Mesh(geos.marker, showWater ? mats.water : mats.biomass);
      const amount = showWater ? 1.1 : clamp(cell.biomass, 0.3, 1);
      marker.scale.set(0.65 + amount, 0.06, 0.65 + amount);
      marker.position.set(x, terrainHeight(x, z) + 0.32, z); marker.renderOrder = 28; groups.overlays.add(marker);
    }
  }
}

function updateKnowledgeFog(a) {
  groups.fog.visible = Boolean(a);
  if (!a) { if (groups.fog.children.length) clear(groups.fog); fogCacheKey = ""; return; }
  const range = visionRangeFor(a);
  const revealKey = (a.communicationReveals || []).map((r) => `${r.x},${r.z},${Math.round(r.until || 0)}`).join(";");
  const cacheKey = `${a.id}|${Math.round(a.x)}|${Math.round(a.z)}|${Math.round((a.orientation || 0) * 12)}|${range}|${Object.keys(a.explored || {}).length}|${revealKey}`;
  if (fogCacheKey === cacheKey) return;
  clear(groups.fog);
  const unknown = [];
  const reveals = a.communicationReveals || [];
  // Entity view uses the same hex lattice as the terrain. The outer hexes are
  // clipped to the hard square map edge.
  const radius = 3.2, root3 = Math.sqrt(3), extent = HALF + radius;
  const rowLimit = Math.ceil(extent / (radius * 1.5)), colLimit = Math.ceil(extent / (root3 * radius) + rowLimit * 0.5);
  for (let row = -rowLimit; row <= rowLimit; row++) for (let col = -colLimit; col <= colLimit; col++) {
    const x = clamp(root3 * radius * (col + row * 0.5), -HALF, HALF - 1), z = clamp(radius * 1.5 * row, -HALF, HALF - 1);
    const point = { x, z };
    const visible = hasMapVision(a, point, range) || (Math.abs(x - a.x) <= radius * 0.5 && Math.abs(z - a.z) <= radius * 0.5);
    const communicated = reveals.some((r) => Math.abs(x - r.x) + Math.abs(z - r.z) <= radius * 1.2);
    const explored = Boolean(a.explored?.[exploreKey(point)]);
    if (!visible && !communicated && !explored) unknown.push(point);
  }
  const draw = (cells, material) => { if (!cells.length) return; const vertices = []; for (const p of cells) { const y = terrainHeight(p.x, p.z) + 1.05; for (let n = 0; n < 6; n++) { const a0 = Math.PI / 6 + n * Math.PI / 3, a1 = Math.PI / 6 + (n + 1) * Math.PI / 3; const x0 = clamp(p.x + Math.cos(a0) * radius, -HALF, HALF - 1), z0 = clamp(p.z + Math.sin(a0) * radius, -HALF, HALF - 1), x1 = clamp(p.x + Math.cos(a1) * radius, -HALF, HALF - 1), z1 = clamp(p.z + Math.sin(a1) * radius, -HALF, HALF - 1); vertices.push(p.x, y, p.z, x0, terrainHeight(x0, z0) + 1.05, z0, x1, terrainHeight(x1, z1) + 1.05, z1); } } const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); const mesh = new THREE.Mesh(geometry, material); mesh.renderOrder = 20; groups.fog.add(mesh); };
  // Previously explored ground remains visually dark through the entity's own
  // memory overlay, not as a second layer of brown square tiles.  The fog mesh
  // now only masks genuinely unknown land.
  draw(unknown, fogMats.unknown);
  fogCacheKey = cacheKey;
}

function ringAt(p, radius, mat) {
  const mesh = new THREE.Mesh(geos.ring, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(radius, radius, radius);
  mesh.position.set(p.x, terrainHeight(p.x, p.z) + 0.13, p.z);
  mesh.renderOrder = 30;
  groups.overlays.add(mesh);
}

// A deliberately small RSS instrument: it records the same organism update that
// drives the world, then optionally returns mismatch information to memory.
function recordCausalLoop(a, before) {
  const signal = [...a.sensoryBuffer].sort((x, y) => y.confidence - x.confidence)[0];
  const entityIndicator = signal?.confidence ?? Math.max(0, ...a.memories.map((m) => m.confidence));
  const viability = clamp((a.energy + a.hydration + a.health) / 300, 0, 1);
  const mismatch = Math.abs(entityIndicator - viability);
  const mode = ui.feedbackMode.value;
  const received = mode === "immediate" || (mode === "delayed" && sim.tick % 12 === 0) || (mode === "independent" && viability < 0.48);
  // RSS comparison is laboratory instrumentation only. It must never grant an
  // organism direct simulator truth or rewrite its memories.
  const corrected = 0;
  const consequence = `ΔE ${(a.energy - before.energy).toFixed(2)}, ΔH₂O ${(a.hydration - before.hydration).toFixed(2)}, Δhealth ${(a.health - before.health).toFixed(2)}`;
  a.rss = {
    entityIndicator, viability, mismatch, received, corrected,
    trace: [
      `Interface: vision, smell, hearing, interoception`,
      `Contact: ${a.sensoryBuffer.length} environmental contacts`,
      `Signal: ${signal ? `${signal.channel} / ${signal.type} (${signal.confidence.toFixed(2)})` : "none"}`,
      `Processing: attention + ${dominantDrive(a)} drive`,
      `State: energy ${a.energy.toFixed(0)}, hydration ${a.hydration.toFixed(0)}, fear ${a.fear.toFixed(0)}`,
      `Representation: ${a.memories.length ? `${a.memories.length} fallible memories` : "absent (reactive control)"}`,
      `Capability: speed ${a.capabilities.speed.toFixed(2)}, hunt ${a.capabilities.canHunt ? "yes" : "no"}, mate ${a.capabilities.canMate ? "yes" : "no"}`,
      `Action: ${a.currentAction}`,
      `Consequence: ${consequence}`,
      `Feedback: ${received ? "diagnostic return observed; entity memory unchanged" : mode === "suppressed" ? "suppressed" : "not yet returned"}`
    ]
  };
}

function drawMinimap() { return profiler.measure("minimap", drawMinimapWork); }
function drawMinimapWork() {
  if (sim.tick - lastMinimapTick < 18 && !selectedAnimal()) return;
  lastMinimapTick = sim.tick;
  const canvas = ui.minimap, c = canvas.getContext("2d"), size = canvas.width;
  const mode = ui.minimapMode?.value || "combined";
  c.fillStyle = "#152119"; c.fillRect(0, 0, size, size);
  // Draw the world itself first.  This makes the minimap a navigator rather
  // than a nearly empty field of organism dots.
  const stride = Math.max(2, Math.ceil(WORLD / size * 2));
  const colour = (cell) => cell.water ? "#3d8fd1" : cell.terrainClass === "snow" ? "#dce9e7" : cell.rocky ? "#69716d" : cell.sandy ? "#bca35e" : cell.wetland ? "#416a4c" : cell.woodland ? "#24503a" : cell.shrubland ? "#376c3d" : cell.terrainClass === "dryGrass" ? "#96834e" : (cell.grassHeight || 0) > 0.68 ? "#3c7441" : cell.biomass > 0.12 ? "#4c8651" : "#765b3e";
  if (mode !== "organisms") for (let z = -HALF; z < HALF; z += stride) for (let x = -HALF; x < HALF; x += stride) {
    const cell = cellAt(x, z); c.fillStyle = colour(cell); const px = (x + HALF) / WORLD * size, pz = (z + HALF) / WORLD * size, d = Math.ceil(stride / WORLD * size) + 1; c.fillRect(px, pz, d, d);
  }
  const point = (a, colour, radius) => { c.fillStyle = colour; c.beginPath(); c.arc((a.x + HALF) / WORLD * size, (a.z + HALF) / WORLD * size, radius, 0, Math.PI * 2); c.fill(); };
  if (mode !== "terrain") {
    if (mode === "groups") {
      const groups = new Map(); for (const a of sim.animals.filter((a) => a.alive)) { const id = a.groupId || `${a.speciesId}:${Math.floor((a.x + HALF) / 28)}:${Math.floor((a.z + HALF) / 28)}`; const g = groups.get(id) || { x: 0, z: 0, n: 0, speciesId: a.speciesId }; g.x += a.x; g.z += a.z; g.n++; groups.set(id, g); }
      for (const g of groups.values()) point({ x: g.x / g.n, z: g.z / g.n }, g.speciesId === "hunter" ? "#d96cff" : "#f0c65b", Math.min(5, 1.5 + Math.sqrt(g.n)));
    } else {
      for (const a of sim.animals.filter((a) => a.alive && a.speciesId === "grazer")) point(a, "#f0c65b", 1.15);
      for (const a of sim.animals.filter((a) => a.alive && a.speciesId === "hunter")) point(a, "#d96cff", 1.8);
      for (const a of sim.animals.filter((a) => a.alive && a.offspringIds?.some((id) => animalById(id)?.alive))) point(a, "#e6bc52", 2.3);
    }
  }
  const selected = selectedAnimal(); if (selected) { c.strokeStyle = "#ffffff"; c.lineWidth = 1.5; c.beginPath(); c.arc((selected.x + HALF) / WORLD * size, (selected.z + HALF) / WORLD * size, 4, 0, Math.PI * 2); c.stroke(); }
}

function updateUI() { return profiler.measure("DOM/UI", updateUIWork); }
function updateUIWork() {
  const herb = sim.animals.filter((a) => a.alive && a.speciesId === "grazer");
  const carn = sim.animals.filter((a) => a.alive && a.speciesId === "hunter");
  const selected = selectedAnimal();
  const corpse = selectedCorpse();
  const terrain = selectedTerrain ? cellAt(selectedTerrain.x, selectedTerrain.z) : null;
  ui.day.textContent = String(sim.day);
  ui.season.textContent = sim.season;
  ui.weather.textContent = sim.weather.type;
  ui.plants.textContent = String(sim.plantCount ?? 0);
  ui.herbivores.textContent = String(herb.length);
  ui.carnivores.textContent = String(carn.length);
  ui.births.textContent = String(sim.births);
  ui.deaths.textContent = String(sim.deaths);
  ui.lockEntity.textContent = entityLocked ? "Unlock camera" : "Lock camera";
  ui.lockEntity.disabled = !selected && !selectedGroupMembers().length;
  ui.favouriteEntity.disabled = !selected;
  const favourites = readLocalList(FAVOURITES_KEY);
  ui.favouriteList.innerHTML = favourites.length ? favourites.map((item) => `<div class="save-slot"><button type="button" data-favourite="${escapeHtml(item.id)}" data-seed="${item.seed}">${escapeHtml(item.label)} <span>Open</span></button><button type="button" data-delete-favourite="${escapeHtml(item.id)}" data-seed="${item.seed}" aria-label="Delete ${escapeHtml(item.label)}">Delete</button></div>`).join("") : `<span class="hint">Select an organism, then favourite it.</span>`;
  const seeds = readLocalList(SEEDS_KEY);
  ui.seedList.innerHTML = seeds.length ? seeds.map((seed) => `<div class="save-slot"><button type="button" data-seed="${seed}">World seed ${seed} <span>Open</span></button><button type="button" data-delete-seed="${seed}" aria-label="Delete world seed ${seed}">Delete</button></div>`).join("") : `<span class="hint">Save the current map seed to revisit it.</span>`;
  const slots = savedSlotMetadata();
  ui.saveSlotList.innerHTML = slots.length ? slots.map((slot) => `<div class="save-slot"><button type="button" data-save-slot="${escapeHtml(slot.name)}">${escapeHtml(slot.name)} <span>seed ${escapeHtml(String(slot.seed))} · day ${escapeHtml(String(slot.day))}</span></button><button type="button" data-delete-save="${escapeHtml(slot.name)}" aria-label="Delete ${escapeHtml(slot.name)}">Delete</button></div>`).join("") : `<span class="hint">No named saves yet. Use Save slot to preserve this world.</span>`;
  if (ui.performance) ui.performance.textContent = `${perf.fps} FPS · ${perf.ticksPerSecond} sim ticks/s · visible organisms ${renderedAnimalCount} / ${sim.animals.filter((a) => a.alive).length} · terrain detail ${terrainDetailStride()}×`;
  if (terrain && !selected && !corpse) {
    const local = cachedWeatherAt(terrain);
    ui.selectedName.textContent = `Terrain ${terrain.x}, ${terrain.z}`;
    ui.selectedKind.textContent = terrain.terrainClass;
    ui.selectedSex.textContent = "-"; ui.selectedAge.textContent = "-";
    ui.selectedStage.textContent = terrain.woodland ? "woodland cover" : terrain.water ? "water" : "open ground";
    ui.selectedSize.textContent = `elevation ${terrain.elevation.toFixed(1)}m; slope ${(terrain.slope * 100).toFixed(0)}%`;
    ui.selectedPregnancy.textContent = "-";
    ui.selectedClimate.textContent = `${local.temp.toFixed(1)}°C; rain ${(local.rain * 100).toFixed(0)}%`;
    ui.selectedAction.textContent = terrain.channel ? `${terrain.waterChannel ? "flowing channel" : "dry channel"}; current flow ${terrain.discharge.toFixed(2)}` : terrain.water ? `water level ${terrain.waterLevel.toFixed(2)}` : `${terrain.plantType}; biomass ${terrain.biomass.toFixed(2)}`;
    ui.selectedEnergy.textContent = `soil ${(terrain.soilDepth * 100).toFixed(0)}%`;
    ui.selectedHydration.textContent = `moisture ${(terrain.moisture * 100).toFixed(0)}%`;
    ui.selectedFeeding.textContent = terrain.woodland ? "cover; not grazeable" : terrain.rocky ? "rocky footing" : terrain.sandy ? "sandy footing" : "open ground";
    ui.selectedDrive.textContent = terrain.channel ? `current ${terrain.discharge.toFixed(2)}; long-term ${terrain.meanDischarge.toFixed(2)}` : `flow ${Math.round(terrain.accumulation)}; drainage ${(terrain.drainage * 100).toFixed(0)}%`;
    ui.selectedExpression.textContent = "not applicable — terrain has no face";
    ui.selectedRelation.textContent = terrain.basinId ? "local basin" : terrain.channel ? "established drainage channel" : "hillslope";
    ui.selectedMemory.textContent = "laboratory-only terrain data";
    ui.selectedTarget.textContent = terrain.flowTo >= 0 ? `downhill index ${terrain.flowTo}` : terrain.outlet ? "map outlet" : "local low";
    ui.selectedAwareness.textContent = "not visible to organisms by default";
    ui.priorityList.innerHTML = terrain.channel ? `<li>Raw channel width: ${terrain.channelWidthRaw.toFixed(2)}</li><li>Final channel width: ${terrain.channelWidth.toFixed(2)}</li><li>Current water width: ${terrain.waterWidth.toFixed(2)}</li><li>Upstream channel contributors: ${terrain.upstreamChannelCount}</li><li>State: ${terrain.waterChannel ? "wet" : "dry"}</li>` : `<li>Fertility: ${(terrain.fertility * 100).toFixed(0)}%</li><li>Rocky: ${terrain.rocky ? "yes" : "no"}</li>`;
    const riverStats = sim.hexWorld?.riverWidthStats;
    ui.rssTrace.innerHTML = terrain.channel ? `<li>River diagnostics — current flow ${terrain.discharge.toFixed(3)}; effective flow ${terrain.meanDischarge.toFixed(3)}.</li><li>Cached world range: ${riverStats?.qLow?.toFixed(3) ?? "-"} to ${riverStats?.qHigh?.toFixed(3) ?? "-"}; hex diameter ${riverStats?.hexDiameter?.toFixed(2) ?? "-"}.</li><li>Join limit: ${riverStats?.miterLimit ?? "-"}× half-width.</li>` : "<li>Laboratory terrain inspection, not entity perception.</li>";
    ui.entityIndicator.textContent = ui.physicalViability.textContent = ui.mismatch.textContent = ui.feedbackStatus.textContent = "-";
    ui.driftStatus.textContent = "Laboratory map data; entities receive only their permitted signals.";
    ui.driftStatus.className = "status";
  } else if (!selected && !corpse) {
    ui.selectedName.textContent = "Map overview";
    ui.selectedKind.textContent = "World";
    ui.selectedSex.textContent = "-";
    ui.selectedAge.textContent = "-";
    ui.selectedStage.textContent = "-";
    ui.selectedSize.textContent = "-";
    ui.selectedPregnancy.textContent = "-";
    ui.selectedClimate.textContent = "-";
    ui.selectedAction.textContent = "Observing";
    ui.selectedEnergy.textContent = "-";
    ui.selectedHydration.textContent = "-";
    ui.selectedFeeding.textContent = "-";
    ui.selectedDrive.textContent = "-";
    ui.selectedExpression.textContent = "-";
    ui.selectedRelation.textContent = "-";
    ui.selectedMemory.textContent = "-";
    ui.selectedTarget.textContent = "-";
    ui.selectedAwareness.textContent = "-";
    ui.priorityList.innerHTML = "";
    ui.rssTrace.innerHTML = "";
    ui.entityIndicator.textContent = ui.physicalViability.textContent = ui.mismatch.textContent = ui.feedbackStatus.textContent = "-";
    ui.driftStatus.textContent = "Select an organism to inspect its causal loop.";
    ui.driftStatus.className = "status";
  } else if (corpse) {
    ui.selectedName.textContent = `${corpse.sourceId} remains`;
    ui.selectedKind.textContent = corpse.speciesId === "grazer" ? "Dead herbivore" : "Dead carnivore";
    ui.selectedSex.textContent = corpse.sex;
    ui.selectedAge.textContent = `${corpse.lived.toFixed(1)} days lived`;
    ui.selectedStage.textContent = corpse.lifeStage;
    ui.selectedSize.textContent = `${(corpse.initialBiomass / 0.52).toFixed(1)} kg; ${corpse.initialBiomass.toFixed(1)} food`;
    ui.selectedPregnancy.textContent = "ended";
    ui.selectedClimate.textContent = "historical";
    ui.selectedAction.textContent = `Died day ${corpse.deathDay}: ${corpse.cause}`;
    ui.selectedEnergy.textContent = corpse.finalEnergy.toFixed(0);
    ui.selectedHydration.textContent = corpse.finalHydration.toFixed(0);
    ui.selectedFeeding.textContent = corpse.eaten ? "skeleton / consumed" : `${corpse.biomass.toFixed(1)} food remains`;
    ui.selectedDrive.textContent = "none";
    ui.selectedExpression.textContent = "historical — organism is deceased";
    ui.selectedRelation.textContent = `${corpse.offspring} offspring`;
    ui.selectedMemory.textContent = corpse.timeline.slice(-4).join("; ");
    ui.selectedTarget.textContent = "none";
    ui.selectedAwareness.textContent = "ended at death";
    ui.priorityList.innerHTML = `<li>Cause: ${escapeHtml(corpse.cause)}</li><li>${corpse.eaten ? "Skeleton exposed" : `Carcass food: ${corpse.biomass.toFixed(1)}`}</li><li>Claimed by: ${escapeHtml(corpse.ownerId || "none")}</li>`;
    ui.rssTrace.innerHTML = `<li>Final consequence: death from ${escapeHtml(corpse.cause)}</li><li>Lifetime: ${corpse.lived.toFixed(1)} days</li>`;
    ui.entityIndicator.textContent = ui.physicalViability.textContent = ui.mismatch.textContent = ui.feedbackStatus.textContent = "-";
    ui.driftStatus.textContent = "Historical record retained while the carcass remains in the world.";
    ui.driftStatus.className = "status";
  } else {
    const s = species[selected.speciesId];
    ui.selectedName.textContent = `${selected.id} ${s.label}`;
    ui.selectedKind.textContent = selected.speciesId === "grazer" ? "Herbivore" : "Carnivore";
    ui.selectedSex.textContent = selected.sex;
    ui.selectedAge.textContent = `${selected.age.toFixed(1)} days`;
    ui.selectedStage.textContent = selected.lifeStage;
    ui.selectedSize.textContent = `${selected.bodyMass.toFixed(1)} kg (${(selected.sizeTrait || 1).toFixed(2)}×)`;
    const cycle = fertilityCycle(selected);
    ui.selectedPregnancy.textContent = selected.pregnant ? `${selected.pregnant.age.toFixed(1)} / ${s.gestation} days` : selected.conception ? `conception in ${Math.max(0, selected.conception.completesAt - sim.tick)} steps` : (selected.courtshipUntil || 0) > sim.tick ? "courtship ♥" : selected.sex === "F" ? (cycle.fertile ? `fertile — cycle day ${cycle.day.toFixed(1)} / ${cycle.period}` : `cycle day ${cycle.day.toFixed(1)} / ${cycle.period}`) : "not applicable";
    const selectedWeather = regionalWeatherAt(selected);
    ui.selectedClimate.textContent = `${selectedWeather.temp.toFixed(1)}°C; rain ${(selectedWeather.rain * 100).toFixed(0)}%; wind ${(selectedWeather.wind * 100).toFixed(0)}%`;
    ui.selectedAction.textContent = causalExplanation(selected);
    ui.selectedEnergy.textContent = selected.energy.toFixed(0);
    const recentHit = selected.lastHit && sim.tick - selected.lastHit.tick <= 48 ? `; last hit ${selected.lastHit.type}${selected.lastHit.attackerId ? ` by ${selected.lastHit.attackerId}` : ""} (−${selected.lastHit.damage})` : "";
    const cap = selected.healthCap ?? 100;
    const trauma = cap <= 60 ? "; critical permanent trauma — 60% recovery ceiling, 62.5% speed loss, longer rest" : cap <= 75 ? "; permanent trauma — 75% recovery ceiling, 25% speed loss" : "";
    ui.selectedHealth.textContent = `${Math.max(0, selected.health).toFixed(0)} / ${cap}${recentHit}${trauma}`;
    ui.selectedHydration.textContent = selected.hydration.toFixed(0);
    ui.selectedInjuries.textContent = (selected.injuries || []).length ? (selected.injuries || []).map((injury) => `${injury.type} ${(injury.severity * 100).toFixed(0)}%${injury.sourceId ? ` from ${injury.sourceId}` : ""}`).join("; ") : "none";
    ui.selectedFeeding.textContent = `${feedingState(selected)} (${selected.stomach.toFixed(0)}%)`;
    ui.selectedDrive.textContent = selected.drive || dominantDrive(selected);
    ui.selectedExpression.textContent = emotionExplanation(selected);
    const preference = selected.sex === "F" && selected.matePreferences ? selected.matePreferences : null;
    ui.selectedRelation.textContent = `${relationText(selected)}; group traits: water ${(selected.waterSkill || 1).toFixed(2)}, food ${(selected.foodSkill || 1).toFixed(2)}, scent ${(selected.scentSkill || 1).toFixed(2)}, care ${(selected.careAffinity || 0.5).toFixed(2)}, aggression ${selected.aggression.toFixed(2)}; mating: ${mateHistoryText(selected)}${preference ? `; mate preference: health ${preference.minHealth.toFixed(0)}+, mass ${preference.preferredMass.toFixed(0)} kg, age ${preference.preferredAge.toFixed(0)} d, aggression ${preference.preferredAggression.toFixed(2)}` : ""}`;
    ui.selectedMemory.textContent = `${selected.memories.length} detailed short-term; ${(selected.longMemory || []).length} vague long-term; ${(selected.injuries || []).length} injuries`;
    ui.selectedTarget.textContent = selected.actionTarget || selected.hunt?.targetId || "none";
    const listening = (selected.stationaryTicks || 0) >= 2 ? "focused listening ×5" : "moving/ordinary listening";
    ui.selectedAwareness.textContent = `${selected.sensoryBuffer.length} contacts; sound ${hearingRangeFor(selected)} cells (${listening}); ${Object.keys(selected.explored || {}).length} map cells explored; ${(selected.communicationReveals || []).length} communicated reveals`;
    ui.priorityList.innerHTML = (selected.priorities || []).map((p, i) => `<li>${i + 1}. ${escapeHtml(p.drive)} — ${p.score}</li>`).join("");
    const rss = selected.rss;
    ui.rssTrace.innerHTML = (rss?.trace || ["Waiting for the next organism update…"]).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
    ui.entityIndicator.textContent = rss ? rss.entityIndicator.toFixed(2) : "-";
    ui.physicalViability.textContent = rss ? rss.viability.toFixed(2) : "-";
    ui.mismatch.textContent = rss ? rss.mismatch.toFixed(2) : "-";
    ui.feedbackStatus.textContent = rss ? (rss.received ? "received" : ui.feedbackMode.value) : "-";
    const drift = rss && rss.entityIndicator >= 0.7 && rss.viability <= 0.48 && rss.mismatch >= 0.25;
    ui.driftStatus.textContent = drift ? "Hidden drift: the organism's accessible indicator remains favourable while physical viability worsens." : "No hidden-drift threshold currently crossed.";
    ui.driftStatus.className = drift ? "status alert" : "status";
  }
  ui.viewMode.textContent = selected ? "Entity awareness" : selectedGroupMembers().length ? "Group overview" : terrain ? "Laboratory terrain" : "Laboratory map";
  updateObserverHud(selected, herb, carn);
  if (!ui.realityPanel.hidden) updateRealityPanel();
  drawMinimap();
  const eventFilter = ui.eventFilter?.value || "all", eventLimit = Number(ui.eventLimit?.value || 12);
  const matchingEvent = (event) => {
    const text = event.toLowerCase();
    if (eventFilter === "danger") return /threat|injur|struck|attack|fight|flee|died/.test(text);
    if (eventFilter === "social") return /courtship|conceiv|pregnan|contact call|care/.test(text);
    if (eventFilter === "life") return /born|died|pregnan|independent/.test(text);
    if (eventFilter === "needs") return /water|hunger|thirst|signal|carcass/.test(text);
    return true;
  };
  const events = sim.events.filter(matchingEvent).slice(-eventLimit).reverse();
  ui.events.innerHTML = events.length ? events.map((e) => `<li>${escapeHtml(e)}</li>`).join("") : `<li>No ${eventFilter === "all" ? "events" : eventFilter + " events"} retained.</li>`;
}

function observerMemberSummary(a) {
  const pregnancy = a.pregnant ? " · pregnant" : "";
  const sex = a.sex === "F" ? "female" : "male";
  return `<li><button type="button" class="observer-member" data-member-focus="${escapeHtml(a.id)}"><strong>${escapeHtml(a.id)}</strong> · ${sex} · ${escapeHtml(a.lifeStage)}${pregnancy}${a.id === a.groupLeaderId ? " · leader" : ""}<span>Energy ${Math.round(a.energy)} · Water ${Math.round(a.hydration)} · Health ${Math.round(a.health)}%</span></button></li>`;
}

function renderObserverDetail(selected, group) {
  if (!ui.hudDetail) return;
  if (group.length && !selected) {
    const leader = group.find((a) => a.id === group[0].groupLeaderId) || group[0];
    if (observerDetailTab === "view") {
      ui.hudDetail.innerHTML = observerOverlayControls();
    } else if (observerDetailTab === "priorities") {
      const alert = leader.groupAlert?.until > sim.tick ? leader.groupAlert : null;
      ui.hudDetail.innerHTML = `<div class="observer-detail-title">Group purpose</div><ol class="observer-list"><li><strong>${escapeHtml(alert?.goal || leader.groupGoal || "travelling")}</strong> is the current shared goal${alert ? ` — alert confidence ${Math.round(alert.score)}%` : ""}.</li>${group.map((a) => `<li>${escapeHtml(a.id)}: ${escapeHtml(a.drive || dominantDrive(a))}</li>`).join("")}</ol>`;
    } else if (observerDetailTab === "trace") {
      const trace = leader.rss?.trace || ["Waiting for the leader's next update…"];
      ui.hudDetail.innerHTML = `<div class="observer-detail-title">Leader causal trace · ${escapeHtml(leader.id)}</div><ol class="observer-list">${trace.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
    } else {
      ui.hudDetail.innerHTML = `<div class="observer-detail-title">Members · ${group.length}</div><ul class="observer-list observer-members">${group.slice().sort((a, b) => Number(b.id === leader.id) - Number(a.id === leader.id)).map(observerMemberSummary).join("")}</ul>`;
    }
    return;
  }
  if (!selected) { ui.hudDetail.innerHTML = ""; return; }
  if (observerDetailTab === "view") {
    ui.hudDetail.innerHTML = observerOverlayControls();
  } else if (observerDetailTab === "priorities") {
    const priorities = selected.priorities || [];
    const threat = selected.threatEvidence;
    const strongestSignal = (selected.receivedSignals || []).sort((a, b) => b.confidence - a.confidence)[0];
    const evidence = threat?.score ? `Threat: ${escapeHtml(threat.explanation)} — ${Math.round(threat.score)}%.` : "No predator evidence — ordinary priorities continue.";
    const signal = strongestSignal ? ` Strongest received signal: ${escapeHtml(socialSignalLabel(strongestSignal.signalKind || strongestSignal.type))} via ${escapeHtml(strongestSignal.channel)} (${Math.round(strongestSignal.confidence * 100)}%).` : "";
    const hunterReason = huntDecisionExplanation(selected);
    ui.hudDetail.innerHTML = `<div class="observer-detail-title">Current priority chain</div><p class="observer-overlay-hint">${evidence}${signal}${hunterReason ? ` ${hunterReason}` : ""}</p><ol class="observer-list">${priorities.length ? priorities.map((p, i) => `<li>${i + 1}. ${escapeHtml(p.drive)} <strong>${p.score}</strong></li>`).join("") : "<li>Waiting for the next decision.</li>"}</ol>`;
  } else if (observerDetailTab === "trace") {
    const trace = selected.rss?.trace || ["Waiting for the next organism update…"];
    ui.hudDetail.innerHTML = `<div class="observer-detail-title">Live RSS causal trace</div><ol class="observer-list">${trace.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
  } else {
    const relation = relationText(selected);
    const pregnancy = selected.pregnant ? `pregnant (${selected.pregnant.age.toFixed(1)} days)` : selected.sex === "F" ? "not pregnant" : "—";
    const signalKind = selected.socialSignal?.until > sim.tick ? selected.socialSignal.kind : "";
    const status = signalKind ? `${socialSignalIcon(signalKind)} ${socialSignalLabel(signalKind)} (${selected.socialSignal.urgency}% urgency)` : "no outward signal";
    const signalMeaning = signalKind ? socialSignalMeaning(signalKind) : "No world symbol is currently emitted.";
    const expression = emotionExplanation(selected);
    const threat = selected.threatEvidence?.score ? `${selected.threatEvidence.explanation} (${Math.round(selected.threatEvidence.score)}%)` : "no predator evidence";
    ui.hudDetail.innerHTML = `<div class="observer-detail-title">Identity and state</div><dl class="observer-detail-grid"><div><dt>Sex / stage</dt><dd>${selected.sex} · ${escapeHtml(selected.lifeStage)}</dd></div><div><dt>Pregnancy</dt><dd>${pregnancy}</dd></div><div class="observer-wide"><dt>Face / expression</dt><dd>${escapeHtml(expression)}</dd></div><div class="observer-wide"><dt>World symbol</dt><dd>${escapeHtml(status)} — ${escapeHtml(signalMeaning)}</dd></div><div><dt>Threat evidence</dt><dd>${escapeHtml(threat)}</dd></div><div><dt>Food state</dt><dd>${escapeHtml(feedingState(selected))} (${Math.round(selected.stomach)}%)</dd></div><div><dt>Relations</dt><dd>${escapeHtml(relation)}</dd></div><div><dt>Target</dt><dd>${escapeHtml(selected.actionTarget || selected.hunt?.targetId || "none")}</dd></div><div><dt>Memory</dt><dd>${selected.memories.length} short-term · ${(selected.longMemory || []).length} long-term</dd></div></dl>`;
  }
}

function observerOverlayControls() {
  const checked = (input) => input.checked ? " checked" : "";
  return `<div class="observer-detail-title">Laboratory overlays</div><p class="observer-overlay-hint">Ambient sound is non-verbal movement/noise. Calls are intentional messages with a source and meaning.</p><div class="observer-overlays"><label><input type="checkbox" data-observer-overlay="perception"${checked(ui.overlayPerception)}> Perception</label><label><input type="checkbox" data-observer-overlay="sound"${checked(ui.overlaySound)}> Ambient sound</label><label><input type="checkbox" data-observer-overlay="calls"${checked(ui.overlayCalls)}> Calls & messages</label><label><input type="checkbox" data-observer-overlay="memory"${checked(ui.overlayMemory)}> Memory</label><label><input type="checkbox" data-observer-overlay="focus"${checked(ui.overlayEntityFocus)}> Isolate observer</label><label><input type="checkbox" data-observer-overlay="biomass"${checked(ui.overlayBiomass)}> Biomass</label><label><input type="checkbox" data-observer-overlay="water"${checked(ui.overlayWater)}> Water</label><label><input type="checkbox" data-observer-overlay="scent"${checked(ui.overlayPheromone)}> Scent trails</label></div>`;
}

function updateObserverHud(selected, herb, carn) {
  const group = selectedGroupMembers();
  ui.hudMode.textContent = selected ? "Entity observer" : group.length ? "Group observer" : "World observer";
  ui.hudDay.textContent = `Day ${sim.day} · ${sim.season} · ${sim.weather.type}`;
  ui.hudPlay.textContent = running ? "Pause" : "Play";
  ui.hudEvent.textContent = sim.events.at(-1) || `${herb.length} herbivores · ${carn.length} carnivores`;
  ui.hudSelection.hidden = !selected && !group.length;
  if (group.length && !selected) {
    const leader = group.find((a) => a.id === group[0].groupLeaderId) || group[0];
    ui.hudSelectedName.textContent = `${group.length} ${leader.speciesId === "hunter" ? "hunters" : "grazers"} — group`;
    ui.hudSelectedAction.textContent = `Goal: ${leader.groupGoal || "travelling"}; leader: ${leader.id}`;
    ui.hudEnergy.textContent = Math.round(group.reduce((n, a) => n + a.energy, 0) / group.length);
    ui.hudHealth.textContent = `${Math.round(group.reduce((n, a) => n + a.health, 0) / group.length)}%`;
    ui.hudWater.textContent = `${Math.round(group.reduce((n, a) => n + a.hydration, 0) / group.length)}%`;
    ui.hudDrive.textContent = leader.groupGoal || "travelling";
    ui.hudLock.textContent = entityLocked ? "Unlock camera" : "Lock camera";
    ui.hudLock.disabled = false;
    ui.hudFavourite.disabled = true;
    renderObserverDetail(null, group);
    return;
  }
  if (!selected) return;
  ui.hudSelectedName.textContent = `${selected.id} ${species[selected.speciesId].label}`;
  ui.hudSelectedAction.textContent = causalExplanation(selected);
  ui.hudEnergy.textContent = Math.max(0, selected.energy).toFixed(0);
  ui.hudHealth.textContent = `${Math.max(0, selected.health).toFixed(0)}%`;
  ui.hudWater.textContent = `${Math.max(0, selected.hydration).toFixed(0)}%`;
  ui.hudDrive.textContent = selected.drive || dominantDrive(selected);
  ui.hudLock.textContent = entityLocked ? "Unlock camera" : "Lock camera";
  ui.hudFavourite.textContent = "Favourite";
  ui.hudLock.disabled = ui.hudFavourite.disabled = false;
  renderObserverDetail(selected, []);
}

function updateRealityPanel() {
  const terrain = { shortGrass: 0, longGrass: 0, shrubland: 0, woodland: 0, water: 0, soil: 0, sand: 0, rock: 0, mud: 0, snow: 0 };
  for (const cell of sim.cells) {
    if (cell.water) terrain.water += 1; else if (cell.terrainClass === "snow") terrain.snow += 1; else if (cell.rocky) terrain.rock += 1; else if (cell.sandy) terrain.sand += 1; else if (cell.wetland) terrain.mud += 1;
    else if (cell.woodland && cell.plantType === "tree") terrain.woodland += 1; else if (cell.woodland || cell.shrubland) terrain.shrubland += 1; else if ((cell.grassHeight || 0) > 0.68) terrain.longGrass += 1; else if (cell.biomass > 0.2) terrain.shortGrass += 1; else terrain.soil += 1;
  }
  const alive = sim.animals.filter((a) => a.alive), count = (fn) => alive.filter(fn).length;
  const item = (name, value) => `<div>${name}<strong>${value}</strong></div>`;
  ui.realityTerrain.innerHTML = [item("Short grass", terrain.shortGrass), item("Long grass", terrain.longGrass), item("Shrubland", terrain.shrubland), item("Tree woodland", terrain.woodland), item("Water", terrain.water), item("Soil / dirt", terrain.soil), item("Sand", terrain.sand), item("Rock", terrain.rock), item("Wetland / mud", terrain.mud), item("Snow", terrain.snow)].join("");
  ui.realityPopulation.innerHTML = [item("All organisms", alive.length), item("Herbivores", count((a) => a.speciesId === "grazer")), item("Carnivores", count((a) => a.speciesId === "hunter")), item("Dependent babies", count((a) => a.lifeStage === "dependent")), item("Juveniles", count((a) => a.lifeStage === "juvenile" || a.lifeStage === "subadult")), item("Adults", count((a) => a.lifeStage === "adult")), item("Old", count((a) => a.lifeStage === "old")), item("Pregnant", count((a) => Boolean(a.pregnant)))].join("");
  const groups = new Map();
  for (const a of alive) if (a.groupId) { const g = groups.get(a.groupId) || { id: a.groupId, kind: a.speciesId, goal: a.groupGoal || "travelling", leader: a.groupLeaderId, members: [] }; g.members.push(a); groups.set(a.groupId, g); }
  const active = [...groups.values()].filter((g) => g.members.length >= 2).sort((a, b) => b.members.length - a.members.length);
  ui.realityGroups.innerHTML = active.length ? active.map((g) => `<button type="button" class="reality-group" data-group-focus="${escapeHtml(g.id)}"><strong>${g.members.length} ${g.kind === "hunter" ? "hunters" : "grazers"}</strong><br>Goal: ${escapeHtml(g.goal)} · leader: ${escapeHtml(g.leader || "none")}<span>Focus group</span></button>`).join("") : `<p class="hint">No multi-organism groups currently formed.</p>`;
}

