const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

const eye = (irisColour, irisRadius, pupilShape, pupilWidth, pupilHeight, eyeScale = 1, gaze = {}) => ({
  shape: "round", eyeScale, evidenceGrade: "composite-model",
  iris: { colour: irisColour, radius: irisRadius, dynamicScaleMinimum: .72, dynamicScaleMaximum: 1.38 },
  pupil: { shape: pupilShape, width: pupilWidth, height: pupilHeight, dilationMinimum: .6, dilationMaximum: 1.76 },
  gaze: { maximumVisualOffset: .14, inwardLimit: gaze.inwardLimit ?? .08, outwardLimit: gaze.outwardLimit ?? .14, upwardLimit: .07, downwardLimit: .07, convergenceLimit: gaze.convergenceLimit ?? .04, stabilization: gaze.stabilization ?? .72 },
  rimColour: 0x30231d, scleraColour: 0xe8ddc5, glintScale: 1, cuteExaggeration: true
});

const ear = (visualType, scale, yawRange, options = {}) => ({
  visualType, scale, thickness: options.thickness ?? .08, curvature: options.curvature ?? .65,
  innerColour: options.innerColour ?? 0x80554e, evidenceGrade: "composite-model",
  mobility: { yawRange, pitchRange: options.pitchRange ?? .3, rollRange: options.rollRange ?? .18, responseSpeed: options.responseSpeed ?? .22, independent: options.independent ?? yawRange > 0 }
});

// These profiles describe deliberately readable cartoon presentation. They do
// not replace the authoritative biological sensor profiles.
export const CARTOON_VISUAL_ANATOMY = freeze({
  "meadow-nibbler": { eye: eye(0x754b27, .46, "horizontal-oval", .25, .15, 1.12, { inwardLimit: .035 }), ear: ear("long-lanceolate", [1.02, 1.65, .9], 1.25, { independent: true }) },
  "great-plains-grazer": { eye: eye(0x4d2f1d, .43, "horizontal-oval", .23, .15, .84), ear: ear("short-lanceolate", [.85, .82, .9], .72) },
  "woodland-browser": { eye: eye(0x65401f, .45, "horizontal-oval", .25, .14, 1.02, { inwardLimit: .035 }), ear: ear("broad-oval", [1.05, 1.1, .95], 1.05) },
  "brush-fox": { eye: eye(0xb87922, .4, "vertical-oval", .15, .23, .95, { inwardLimit: .1, convergenceLimit: .08 }), ear: ear("tall-pointed", [.9, 1.08, .88], .92) },
  "shadow-stalker": { eye: eye(0xb8953d, .43, "round", .18, .2, 1.02, { inwardLimit: .11, convergenceLimit: .09 }), ear: ear("tufted-pointed", [.88, .88, .9], .78) },
  "great-omnivore": { eye: eye(0x4b3425, .38, "round", .18, .18, .82), ear: ear("small-rounded", [.72, .64, .88], .48) },
  "dryland-runner": { eye: eye(0x6a4825, .46, "horizontal-oval", .26, .14, 1.04, { inwardLimit: .03 }), ear: ear("cupped-leaf", [1, 1.15, .92], 1.02) },
  "highland-grazer": { eye: eye(0x684523, .43, "horizontal-oval", .23, .15, .9, { inwardLimit: .04 }), ear: ear("short-lanceolate", [.8, .78, .9], .75) },
  "armoured-browser": { eye: eye(0x4b3523, .4, "horizontal-oval", .21, .14, .72, { inwardLimit: .025 }), ear: ear("short-rounded", [.64, .62, .88], .62) },
  "pack-breaker": { eye: eye(0x5c3925, .4, "round", .18, .18, .9, { inwardLimit: .08 }), ear: ear("broad-rounded", [.9, .82, .92], .75) },
  "carrion-runner": { eye: eye(0x3d2a18, .48, "broad-round", .25, .25, 1.12), ear: ear("hidden-opening", [0, 0, 0], 0, { independent: false }) },
  "waterline-grazer": { eye: eye(0x513823, .43, "horizontal-oval", .23, .16, .94), ear: ear("small-rounded", [.62, .58, .85], .55) },
  "brush-nibbler": { eye: eye(0x6d4929, .47, "horizontal-oval", .26, .15, 1.15, { inwardLimit: .03 }), ear: ear("long-lanceolate", [.98, 1.55, .88], 1.22) },
  "waterline-ambusher": { eye: eye(0x98833e, .45, "vertical-slit", .1, .25, .76), ear: ear("aural-flap", [0, 0, 0], 0, { independent: false }) },
  "northern-shaggy-grazer": { eye: eye(0x4f3423, .4, "horizontal-oval", .21, .14, .76), ear: ear("fur-hidden-short", [.62, .58, .82], .52) },
  "highland-prowler": { eye: eye(0x9fa75f, .44, "round", .19, .2, 1.02, { inwardLimit: .11, convergenceLimit: .1 }), ear: ear("small-rounded", [.72, .7, .88], .68) },
  "little-opportunist": { eye: eye(0x59411f, .43, "round", .19, .2, 1.05, { inwardLimit: .1 }), ear: ear("small-rounded", [.72, .7, .9], .68) },
  "cold-country-scavenger": { eye: eye(0x8e4b1f, .45, "broad-round", .24, .24, 1.02), ear: ear("feather-covered-opening", [0, 0, 0], 0, { independent: false }) },
  "sunscale-ambusher": { eye: eye(0x6f5b24, .42, "vertical-slit", .1, .25, .82), ear: ear("jaw-conduction", [0, 0, 0], 0, { independent: false }) },
  "shieldback-colony": { eye: eye(0x3d2d1d, .4, "round", .18, .18, .82), ear: ear("tympanum", [0, 0, 0], 0, { independent: false }) },
  "wild-boar": { eye: eye(0x4d3421, .4, "horizontal-oval", .21, .14, .82), ear: ear("cupped-leaf", [.86, .88, .9], .72) },
  "african-elephant": { eye: eye(0x514134, .39, "round", .18, .18, .74), ear: ear("fan", [1.5, 1.72, .72], .28, { pitchRange: .18, independent: true }) },
  dromedary: { eye: eye(0x714922, .45, "horizontal-oval", .25, .14, 1.02, { inwardLimit: .04 }), ear: ear("small-rounded", [.64, .68, .88], .58) },
  "common-ostrich": { eye: eye(0x614425, .48, "round", .26, .26, 1.25), ear: ear("feather-covered-opening", [0, 0, 0], 0, { independent: false }) }
});

export const VISUAL_ANATOMY_SPECIES_IDS = freeze(Object.keys(CARTOON_VISUAL_ANATOMY));
export const visualAnatomyProfile = speciesOrId => CARTOON_VISUAL_ANATOMY[typeof speciesOrId === "string" ? speciesOrId : speciesOrId?.speciesId] || null;
