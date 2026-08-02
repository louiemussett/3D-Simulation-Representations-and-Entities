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

export function ellipsoidSurfaceValue(position, radii) {
  return (position.x / radii.x) ** 2 + (position.y / radii.y) ** 2 + (position.z / radii.z) ** 2;
}
