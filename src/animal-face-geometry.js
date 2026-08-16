export const ANIMAL_EYE_PLACEMENT = Object.freeze({
  // The grazer head uses a 0.42-radius sphere scaled to these radii.
  // Centres sit on that ellipsoid, leaving only the small eyeball radius proud.
  grazer: Object.freeze({ x: .105, y: .055, z: .145 }),
  // The hunter's rotated tapered muzzle is narrower, so its eyes sit closer
  // to the centreline and face instead of hovering beside the mesh.
  hunter: Object.freeze({ x: .08, y: .07, z: .08 })
});
import { eatsMeat } from "./species-registry.js";

export function animalEyePosition(speciesId, side, scale = 1) {
  const placement = ANIMAL_EYE_PLACEMENT[speciesId] || ANIMAL_EYE_PLACEMENT[eatsMeat(speciesId) ? "hunter" : "grazer"];
  return { x: Math.sign(side || 1) * placement.x * scale, y: placement.y * scale, z: placement.z * scale };
}

// Added species use several head proportions, so a fixed world-space offset can
// put an eye beyond a small head or beyond the point of a tapered muzzle. Derive
// the eye centre from the actual scaled surface instead. The two original
// species deliberately continue to use animalEyePosition above unchanged.
export function attachedAnimalEyePosition({ side = 1, headScale, headKind = "rounded" } = {}) {
  const scale = {
    x: Math.max(Number(headScale?.x) || 0, Number.EPSILON),
    y: Math.max(Number(headScale?.y) || 0, Number.EPSILON),
    z: Math.max(Number(headScale?.z) || 0, Number.EPSILON)
  };
  const direction = Math.sign(side || 1);
  if (headKind === "tapered") {
    // ConeGeometry is one unit long on local Y. After its quarter turn, that
    // axis is the animal's forward Z axis and local Z becomes vertical.
    const halfLength = scale.y * .5;
    const z = halfLength * .22;
    const crossSection = (halfLength - z) / (halfLength * 2);
    const radiusX = .46 * scale.x * crossSection;
    const radiusY = .46 * scale.z * crossSection;
    const lateral = .72;
    const vertical = Math.sqrt(1 - lateral ** 2);
    return { x: direction * radiusX * lateral, y: radiusY * vertical, z };
  }
  // SphereGeometry has radius .42 before its per-species ellipsoid scale.
  const radii = { x: .42 * scale.x, y: .42 * scale.y, z: .42 * scale.z };
  const lateral = .55, vertical = .3;
  const forward = Math.sqrt(Math.max(0, 1 - lateral ** 2 - vertical ** 2));
  return { x: direction * radii.x * lateral, y: radii.y * vertical, z: radii.z * forward };
}

export function ellipsoidSurfaceValue(position, radii) {
  return (position.x / radii.x) ** 2 + (position.y / radii.y) ** 2 + (position.z / radii.z) ** 2;
}

// Keep a rendered iris on its own outward-facing side of the head. Biological
// sensor fields remain authoritative; this is only the visible eyeball stop.
export function constrainedVisualEyeYaw(side, requestedYaw = 0, { minimumOutward = .08, maximumOutward = .62 } = {}) {
  const direction = Math.sign(side || 1), requested = Math.abs(Number(requestedYaw) || 0);
  const magnitude = Math.max(minimumOutward, Math.min(maximumOutward, requested));
  return direction * magnitude;
}
