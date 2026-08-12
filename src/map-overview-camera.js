const finite = value => Number.isFinite(Number(value));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const ZOOM_LEVELS = Object.freeze({ "map-sized": 1, far: 1.5, "very-far": 2.5, extreme: 4 });
const HAZE_MODES = new Set(["off", "light", "natural"]);
const MAP_DIRECTION = Object.freeze({ x: .28, y: .92, z: .28 });

const fallbackBounds = () => ({ min: { x: -45, y: 0, z: -45 }, max: { x: 45, y: 0, z: 45 }, center: { x: 0, y: 0, z: 0 }, radius: Math.hypot(45, 45) });
const isBounds = value => finite(value?.min?.x) && finite(value?.max?.x) && finite(value?.min?.z) && finite(value?.max?.z);

export function terrainBounds(points = [], { horizontalMargin = 0, verticalMargin = 0 } = {}) {
  if (isBounds(points)) return points;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const point of points || []) {
    if (!finite(point?.x) || !finite(point?.z)) continue;
    const y = finite(point?.elevation) ? Number(point.elevation) : finite(point?.y) ? Number(point.y) : 0;
    minX = Math.min(minX, Number(point.x)); maxX = Math.max(maxX, Number(point.x));
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, Number(point.z)); maxZ = Math.max(maxZ, Number(point.z));
  }
  if (!Number.isFinite(minX)) return fallbackBounds();
  const xMargin = Math.max(0, Number(horizontalMargin) || 0), yMargin = Math.max(0, Number(verticalMargin) || 0);
  minX -= xMargin; maxX += xMargin; minZ -= xMargin; maxZ += xMargin; minY -= yMargin; maxY += yMargin;
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ }, center, radius: Math.hypot((maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2) };
}

function boundsCorners(bounds) {
  const result = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) result.push({ x, y, z });
  return result;
}
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function mapOverviewFrame(points = [], { fovDegrees = 46, aspect = 1, padding = 1.12, horizontalMargin = 0, verticalMargin = 0 } = {}) {
  const bounds = terrainBounds(points, { horizontalMargin, verticalMargin }), target = { ...bounds.center };
  const directionLength = Math.hypot(MAP_DIRECTION.x, MAP_DIRECTION.y, MAP_DIRECTION.z);
  const direction = { x: MAP_DIRECTION.x / directionLength, y: MAP_DIRECTION.y / directionLength, z: MAP_DIRECTION.z / directionLength };
  const rightLength = Math.hypot(direction.z, direction.x) || 1;
  const right = { x: -direction.z / rightLength, y: 0, z: direction.x / rightLength };
  const up = { x: direction.y * right.z, y: direction.z * right.x - direction.x * right.z, z: -direction.y * right.x };
  const verticalHalfFov = clamp(Number(fovDegrees) || 46, 20, 160) * Math.PI / 360;
  const tanVertical = Math.tan(verticalHalfFov), tanHorizontal = tanVertical * clamp(Number(aspect) || 1, .1, 10), safePadding = Math.max(1, Number(padding) || 1);
  let requiredDistance = 0;
  for (const corner of boundsCorners(bounds)) {
    const relative = subtract(corner, target), towardCamera = dot(relative, direction);
    requiredDistance = Math.max(requiredDistance, towardCamera + Math.abs(dot(relative, right)) * safePadding / tanHorizontal, towardCamera + Math.abs(dot(relative, up)) * safePadding / tanVertical);
  }
  const framingDistance = Math.max(40, requiredDistance + Math.max(1, bounds.radius * .025));
  return {
    target,
    position: { x: target.x + direction.x * framingDistance, y: target.y + direction.y * framingDistance, z: target.z + direction.z * framingDistance },
    distance: framingDistance,
    bounds
  };
}

export function observerCameraEnvelope(points = [], {
  cameraPosition = null,
  fovDegrees = 46,
  aspect = 1,
  padding = 1.12,
  zoomLevel = "far",
  hazeMode = "natural",
  hazeColour = 0x18201c,
  cinema = false,
  horizontalMargin = 0,
  verticalMargin = 0
} = {}) {
  const frame = mapOverviewFrame(points, { fovDegrees, aspect, padding, horizontalMargin, verticalMargin }), bounds = frame.bounds;
  const level = ZOOM_LEVELS[zoomLevel] || ZOOM_LEVELS.far, mode = HAZE_MODES.has(hazeMode) ? hazeMode : "natural";
  const zoomLimitDistance = Math.max(520, frame.distance) * level;
  const position = cameraPosition && finite(cameraPosition.x) && finite(cameraPosition.y) && finite(cameraPosition.z) ? cameraPosition : frame.position;
  const corners = boundsCorners(bounds), farthestTerrainDistance = Math.max(...corners.map(corner => distance(position, corner)));
  const cameraDistance = distance(position, bounds.center), safety = Math.max(60, bounds.radius * .24);
  const permittedDistance = cinema ? cameraDistance : zoomLimitDistance;
  const cameraFarPlane = Math.max(1200, farthestTerrainDistance + safety, permittedDistance + bounds.radius + safety);
  let fogNear = null, fogFar = null;
  if (mode !== "off") {
    fogNear = Math.max(1, farthestTerrainDistance * (mode === "light" ? .72 : .42));
    fogFar = farthestTerrainDistance + Math.max(mode === "light" ? 90 : 70, bounds.radius * (mode === "light" ? .34 : .24));
  }
  return { mapFramingDistance: frame.distance, zoomLimitDistance, cameraFarPlane, fogNear, fogFar, hazeColour, zoomLevel: cinema ? "cinema" : zoomLevel, hazeMode: mode, farthestTerrainDistance, frame, bounds };
}

export const OBSERVER_ZOOM_LEVELS = ZOOM_LEVELS;
