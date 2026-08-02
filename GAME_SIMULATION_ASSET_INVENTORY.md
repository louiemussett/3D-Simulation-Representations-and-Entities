# RSS Living Laboratory — Asset and Dependency Inventory

## Stored assets

The repository contains no models, audio, music, video, shaders, maps, fonts or conventional world textures. The only binary/vector art files are twelve tiny marker icons. Static inspection found no active source reference to these paths, so their status is **Unused** unless consumed outside the tracked application.

| Asset | Type | Approx. size | Intended appearance/purpose | Active loading/use | Licence/fallback |
|---|---|---:|---|---|---|
| `assets/icons/young.svg` | SVG | <2 KB | young life-stage icon | Unused; no reference found | no separate licence/fallback |
| `assets/icons/young.png` | PNG | <2 KB | raster copy | Unused | same |
| `assets/icons/old.svg` | SVG | <2 KB | old life-stage icon | Unused | same |
| `assets/icons/old.png` | PNG | <2 KB | raster copy | Unused | same |
| `assets/icons/herbivore-male.svg` | SVG | <2 KB | male grazer marker | Unused | same |
| `assets/icons/herbivore-male.png` | PNG | <2 KB | raster copy | Unused | same |
| `assets/icons/herbivore-female.svg` | SVG | <2 KB | female grazer marker | Unused | same |
| `assets/icons/herbivore-female.png` | PNG | <2 KB | raster copy | Unused | same |
| `assets/icons/carnivore-male.svg` | SVG | <2 KB | male hunter marker | Unused | same |
| `assets/icons/carnivore-male.png` | PNG | <2 KB | raster copy | Unused | same |
| `assets/icons/carnivore-female.svg` | SVG | <2 KB | female hunter marker | Unused | same |
| `assets/icons/carnivore-female.png` | PNG | <2 KB | raster copy | Unused | same |

Dimensions were not material to runtime because the files are not loaded. File sizes observed ranged approximately 192–1,106 bytes. PNG/SVG pairs are duplicates in purpose, not byte-identical duplicates.

## Runtime-generated assets

| Asset family | Type/source | Purpose/loading | Reuse/failure handling |
|---|---|---|---|
| Animal anatomy | Three.js primitive geometries/materials in `app.js` and `animal-visual-structure.js` | body/head/eyes/tail/markers/wounds/status | constructed synchronously; shared resources reused, owned extras disposed |
| Terrain/water/vegetation | procedural meshes/instancing from hex cell data | whole landscape | synchronous chunk generation; no file failure path |
| Badge/face/health/thought textures | browser Canvas 2D → `THREE.CanvasTexture` | billboard symbols and bars | cached/shared where appropriate; canvas support assumed |
| Trails/fog/connectors | dynamic `BufferGeometry`/typed arrays | movement and diagnostic overlays | preallocated/bounded; explicit owned disposal |
| Minimap | HTML canvas drawing | cached static terrain + dynamic entities | synchronous; canvas support assumed |
| CSS appearance | `src/styles.css` | panels, controls, bars, responsive layout | browser-native; no external font |

## External dependency inventory

| Dependency/source | Version | Role | Load mode/network requirement | Failure handling/status |
|---|---:|---|---|---|
| Three.js `https://unpkg.com/three@0.165.0/build/three.module.js` | pinned 0.165.0 | WebGL scene/rendering | browser ES module CDN; network required unless cached | startup error surface; no local fallback |
| Three.js addons `https://unpkg.com/three@0.165.0/examples/jsm/` | pinned 0.165.0 | OrbitControls | CDN import map | no local fallback |
| `@playwright/test` | `^1.61.1` in package, resolved lockfile | headless smoke/visual testing | development install only | normal app does not depend on it |
| Node.js/npm | version not pinned in repo | static server, tests, syntax check, benchmark | local development runtime | commands fail clearly if absent |
| Browser WebGL/Canvas/IndexedDB | platform API | rendering and persistence | local browser capability | storage fallback/error events; WebGL fallback limited |

There are no analytics, telemetry, external APIs, server databases, remote images, external models or audio calls. Offline, the local project server can start, but a cold browser load fails if the pinned unpkg Three.js modules are not cached. No visible third-party asset licence or attribution file was found; Three.js licensing remains an external dependency consideration.

## Missing and placeholder audit

- **Confirmed absent:** audio despite a sound-information overlay; actual textures/models; shader source; font files.
- **Unused:** all twelve stored icon variants.
- **No missing file references found:** active visuals are generated rather than requesting the icon files.
- **Performance implication:** runtime canvas textures and many primitive/instanced landscape objects replace download cost with CPU/GPU creation and draw-call cost.
