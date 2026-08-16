import { biologicalPhenotype } from "../biological-phenotypes.js";
import { visualAnatomyProfile, VISUAL_ANATOMY_SPECIES_IDS } from "./visual-anatomy-registry.js";

const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
};

const NO_PINNA = new Set(["carrion-runner", "cold-country-scavenger", "common-ostrich", "waterline-ambusher", "sunscale-ambusher", "shieldback-colony"]);
const THERMAL = new Set(["sunscale-ambusher"]), VIBRATION = new Set(["sunscale-ambusher", "shieldback-colony", "waterline-ambusher", "african-elephant"]);

export const SENSOR_ANATOMY_PROFILES = freeze(Object.fromEntries(VISUAL_ANATOMY_SPECIES_IDS.map(speciesId => {
  const biology = biologicalPhenotype(speciesId), visual = visualAnatomyProfile(speciesId), lateral = Math.max(.08, Math.min(.24, Number(biology?.vision?.eyeLateralOffset ?? .15)));
  const receptorType = visual.ear.visualType === "tympanum" ? "tympanum" : visual.ear.visualType === "jaw-conduction" ? "jaw-conduction" : visual.ear.visualType.includes("opening") || visual.ear.visualType === "aural-flap" ? "feather-covered-opening" : "external-pinna";
  const sensors = [
    { id: "left-eye", type: "vision", anatomicalParent: "head", localPosition: [-lateral, .06, .14], localForward: [-.2, 0, .98], mobility: { yawMinimum: -visual.eye.gaze.outwardLimit, yawMaximum: visual.eye.gaze.inwardLimit, pitchMinimum: -.12, pitchMaximum: .12 }, evidenceGrade: "composite-model", confidence: .55 },
    { id: "right-eye", type: "vision", anatomicalParent: "head", localPosition: [lateral, .06, .14], localForward: [.2, 0, .98], mobility: { yawMinimum: -visual.eye.gaze.inwardLimit, yawMaximum: visual.eye.gaze.outwardLimit, pitchMinimum: -.12, pitchMaximum: .12 }, evidenceGrade: "composite-model", confidence: .55 },
    { id: "left-ear", type: "audition", receptorType, anatomicalParent: "head", localPosition: [-.2, .14, .01], localForward: [-.15, 0, .99], mobility: { yawMinimum: -visual.ear.mobility.yawRange, yawMaximum: visual.ear.mobility.yawRange, independent: visual.ear.mobility.independent }, visibleGeometryRequired: !NO_PINNA.has(speciesId), evidenceGrade: "composite-model", confidence: .5 },
    { id: "right-ear", type: "audition", receptorType, anatomicalParent: "head", localPosition: [.2, .14, .01], localForward: [.15, 0, .99], mobility: { yawMinimum: -visual.ear.mobility.yawRange, yawMaximum: visual.ear.mobility.yawRange, independent: visual.ear.mobility.independent }, visibleGeometryRequired: !NO_PINNA.has(speciesId), evidenceGrade: "composite-model", confidence: .5 },
    { id: "olfactory-origin", type: "olfaction", anatomicalParent: speciesId === "african-elephant" ? "trunk-tip" : "head", localPosition: [0, -.03, .24], evidenceGrade: "composite-model", confidence: .5 }
  ];
  if (THERMAL.has(speciesId)) sensors.push({ id: "facial-thermal-pits", type: "thermal", anatomicalParent: "head", localPosition: [0, -.02, .22], receptorType: "pit-organ-cluster", evidenceGrade: "observed-exact-species", confidence: .8 });
  if (VIBRATION.has(speciesId)) sensors.push({ id: "vibration-receptor", type: "vibration", anatomicalParent: speciesId === "african-elephant" ? "feet" : "body", localPosition: [0, -.18, 0], receptorType: speciesId === "sunscale-ambusher" ? "jaw-conduction" : "substrate-vibration", evidenceGrade: "composite-model", confidence: .5 });
  return [speciesId, { schema: 1, speciesId, scientificName: biology?.scientificName || null, sensors }];
})));

export const sensorAnatomyProfile = speciesOrId => SENSOR_ANATOMY_PROFILES[typeof speciesOrId === "string" ? speciesOrId : speciesOrId?.speciesId] || null;

