import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RESOURCE_OWNERSHIP } from "../resource-ownership.js";

export const OBSERVER_MIN_DISTANCE = .55;
export const SCENE_GROUP_NAMES = Object.freeze(["terrain", "plants", "water", "weather", "animals", "intent", "selection", "fog", "overlays", "scent", "corpses"]);

export function createBrowserRenderRuntime({ viewport, testMode = false, renderScale = 1, devicePixelRatio = 1 } = {}) {
  if (!viewport?.appendChild) throw new TypeError("Browser render runtime requires a viewport element");
  const renderer = new THREE.WebGLRenderer({ antialias: !testMode });
  renderer.setPixelRatio(testMode ? 1 : Math.min(2, devicePixelRatio * renderScale));
  renderer.setSize(viewport.clientWidth, viewport.clientHeight); renderer.setClearColor(0x18201c); viewport.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x18201c, 330, 900);
  const camera = new THREE.PerspectiveCamera(46, viewport.clientWidth / viewport.clientHeight, .1, 1200); camera.position.set(175, 230, 190);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, zoomToCursor: true, enablePan: true, enableRotate: true, screenSpacePanning: true, maxPolarAngle: Math.PI * .49, minDistance: OBSERVER_MIN_DISTANCE, maxDistance: 520, zoomSpeed: 1.25, panSpeed: .9, rotateSpeed: .75 }); controls.target.set(0, 0, 0);
  const skyLight = new THREE.HemisphereLight(0xf4fff2, 0x263029, 2.2); scene.add(skyLight);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(12, 18, 10); scene.add(sun);
  const groups = Object.fromEntries(SCENE_GROUP_NAMES.map(name => [name, new THREE.Group()]));
  for (const name of ["terrain", "plants", "water", "corpses"]) groups[name].userData.resourceOwnership = RESOURCE_OWNERSHIP.chunk;
  for (const name of ["fog", "overlays", "scent", "weather"]) groups[name].userData.resourceOwnership = RESOURCE_OWNERSHIP.temporary;
  for (const name of ["animals", "intent", "selection"]) groups[name].userData.resourceOwnership = RESOURCE_OWNERSHIP.entity;
  for (const group of Object.values(groups)) scene.add(group);
  return Object.freeze({ renderer, scene, camera, controls, skyLight, sun, groups });
}
