import { evaluateVision, visionFov } from "./vision-model.js";

/** The simulation-facing vision boundary. Rendering may consume its result but
 * must not perform a second, contradictory visibility calculation. */
export function createVisionInterface({ environment, rangeFor, salienceFor = () => 1 }) {
  if (!environment || typeof rangeFor !== "function") throw new TypeError("Vision interface requires environment and rangeFor");
  return Object.freeze({
    rangeFor,
    fieldOfViewFor: animal => visionFov(animal.speciesId, animal.sensoryFocusTicks ?? animal.focusTicks ?? animal.stationaryTicks ?? 0),
    observe(viewer, target, { range = rangeFor(viewer), targetHeight = .38 } = {}) {
      return evaluateVision(viewer, target, {
        range,
        surfaceHeight: environment.surfaceHeight,
        targetHeight,
        salience: target.id ? salienceFor(viewer, target, range) : 1,
        coverOpacity: environment.coverOpacity
      });
    }
  });
}

