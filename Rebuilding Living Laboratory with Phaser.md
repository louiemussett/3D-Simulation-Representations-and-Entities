# Feasibility report: rebuilding Living Laboratory with Phaser

No implementation was performed.

## Executive conclusion

Rebuilding the project with Phaser is technically feasible, but it only makes strong architectural sense if you are willing to redesign Living Laboratory as a primarily 2D or 2.5D isometric simulation.

Phaser would be a good fit for:

- A top-down or isometric simulation-game presentation
- Sprite-based animals
- Large tiled landscapes
- Icons, thought bubbles and status overlays
- Menus, input handling and scene management
- A browser-first release
- A simpler, more conventional game-development workflow

Phaser would be a poor direct replacement for:

- The current freely rotatable 3D world
- Three-dimensional animals assembled from geometry
- Perspective-dependent heads, tails and animation poses
- Terrain viewed from low and high camera angles
- 3D diagnostic sectors, rings, shadows and spatial overlays
- The existing Three.js presentation code

The most important point is that Phaser would not inherently solve the simulation’s main CPU costs. Perception, memory, spatial queries, ecological decisions and hundreds of entity updates would remain expensive unless the simulation architecture itself were improved.

My recommendation is:

> Do not migrate the current project directly to Phaser merely for performance. Consider Phaser only if you want to deliberately transform Living Laboratory into a polished 2D/isometric simulation game.

## What Phaser is

Phaser is a browser-oriented 2D game framework supporting JavaScript and TypeScript. It provides:

- WebGL rendering
- Scenes
- 2D cameras
- Sprites and animation
- Tilemaps
- Input handling
- Audio
- Tweens
- Particles
- Arcade and Matter physics
- Asset loading
- Filters and shaders

Phaser describes itself explicitly as a 2D HTML5 game framework. It can be wrapped for desktop and mobile distribution through external packaging systems, but its native environment remains the browser and web platform. [Official Phaser repository](https://github.com/phaserjs/phaser)

As of July 2026, Phaser 4 is released, with the official release page listing version 4.2.1. Phaser 4 introduced a new WebGL renderer, revised cameras, filters and GPU-oriented sprite and tilemap layers. [Official Phaser 4 releases](https://phaser.io/download/phaser4)

## Compatibility with the current project

### Simulation logic: highly compatible

Most authoritative simulation systems could remain ordinary JavaScript modules:

- Ecological clock and accelerated years
- Seasons and weather
- Physiology
- Hydration and dehydration
- Hunger and body composition
- Pregnancy and reproduction
- Animal memory
- Family trees
- Social relationships
- Group membership and leadership
- Perception
- Decision priorities
- Predation
- Personal space
- Carcass ecology
- Save data
- Benchmarking

These systems should not depend on Three.js or Phaser. They should consume plain data and produce authoritative simulation state.

A clean Phaser rewrite could therefore reuse concepts, algorithms, constants and tests from the existing project. However, code currently intertwined with rendering or DOM updates would need separation first.

### Current renderer: poorly compatible

The existing presentation is genuinely three-dimensional:

- Three.js geometry represents animals.
- Terrain has height.
- The camera can orbit and change elevation.
- Animal orientation exists in world space.
- Heads and bodies have three-dimensional poses.
- Diagnostic regions sit on the terrain.
- Lighting, contact shadows and camera-relative scaling depend on 3D projection.

Phaser cameras are 2D scene cameras. Phaser’s renderer processes 2D game objects rather than acting as a general replacement for Three.js. [Official Phaser WebGL renderer documentation](https://docs.phaser.io/api-documentation/class/renderer-webgl-webglrenderer)

Phaser could reproduce the appearance from a fixed isometric viewpoint, but it would do so using:

- Sprites
- Layered images
- 2D shapes
- Pre-rendered directional animation
- Isometric coordinate conversion
- Artificial depth sorting

That would be a visual redesign rather than a renderer port.

## Three possible Phaser approaches

### Option A: full 2D top-down rewrite

This is the safest Phaser interpretation.

The world becomes a top-down map. Animals are animated sprites or vector-like textures. Terrain is represented by tiles or larger rendered chunks.

Advantages:

- Straightforward camera and input model
- Easy entity selection
- Clear diagnostic overlays
- Excellent readability
- Easier icon placement
- Less symbol overlap
- Easier screenshot composition
- Potentially much lower rendering cost
- Simpler animation production
- Good fit for large populations

Disadvantages:

- Loses the current three-dimensional identity
- Animals no longer have visible 3D body posture
- Landscape elevation becomes symbolic
- Lower-angle cinematic screenshots become unavailable

Feasibility: high.

### Option B: fixed 2.5D isometric rewrite

This is probably the most visually appropriate Phaser option.

The world would use an isometric projection, preserving a sense of terrain, distance and scale. Animals could be drawn as multi-directional sprites or simple vector-textured entities.

Advantages:

- Preserves much of the simulation-game aesthetic
- More visually distinctive than top-down presentation
- Easier to read than the current unrestricted camera
- Thought bubbles and badges can occupy stable screen positions
- Terrain and water can remain visually attractive
- Suitable for menu screenshots
- Supports explicit foreground and background composition

Disadvantages:

- Isometric depth sorting can become complicated.
- Tall terrain, forests and overlapping animals can obscure one another.
- Every animal animation may need multiple directional versions.
- Camera rotation would be limited or require alternate sprite sets.
- Current 3D animation logic cannot be transferred directly.
- Diagnostic overlays require custom isometric projection.

Feasibility: medium to high.

### Option C: Phaser interface combined with Three.js rendering

Phaser could theoretically manage menus, scenes or 2D overlays while Three.js continues rendering the world.

I do not recommend this.

It would introduce:

- Two rendering systems
- Two camera models
- Two input-coordinate systems
- More GPU state complexity
- More difficult resizing
- Complicated selection and hit testing
- Additional context-loss handling
- Uncertain performance improvements

The project already has a capable HTML interface. Adding Phaser merely for menus and overlays would offer little benefit.

Feasibility: technically possible, strategically weak.

## Rendering performance

Phaser 4 has features that are attractive for large 2D simulations.

Its official project description highlights GPU sprite and tilemap layers intended to render extremely large numbers of visual elements efficiently. Static or mostly static scenery is particularly well suited to GPU batching. [Official Phaser repository](https://github.com/phaserjs/phaser)

Potential gains include:

- Vegetation represented through batched sprites
- Terrain rendered as large tile layers
- Fewer draw calls
- Efficient 2D animation
- Easy camera culling
- Texture atlases for symbols and expressions
- Fewer individual geometry objects
- Simplified shadows and lighting

However, these gains concern presentation. Phaser would not automatically accelerate:

- Which animals perceive one another
- Line-of-sight queries
- Memory updates
- Priority evaluation
- Group formation
- Pathfinding
- Pregnancy and physiology
- Ecological accounting
- Social relationship graphs

A 500-entity simulation can still saturate the CPU even if every animal is represented by one cheap sprite.

## Physics

Phaser supplies Arcade Physics and Matter.js.

Arcade Physics is designed for fast, comparatively simple shapes such as circles and rectangles. Matter supports rigid bodies, compound shapes, constraints, friction and more advanced collision behaviour. [Official Phaser physics overview](https://docs.phaser.io/phaser/concepts/physics), [Matter integration](https://docs.phaser.io/api-documentation/4.0.0/class/physics-matter-matterphysics)

Neither should become the authoritative animal simulation.

Living Laboratory animals are goal-driven agents, not conventional physics objects. Their movement is governed by:

- Navigation
- Perception
- Personal space
- Pursuit
- Group movement
- Terrain restrictions
- Resource acquisition
- Interaction contact
- Behavioural commitment

The simulation should continue using its own spatial index and movement rules. Phaser physics might help with pointer hit areas or limited presentation collisions, but a full Matter body for every animal could add unnecessary cost and nondeterminism.

## Terrain

Phaser is well suited to grid or tile-based landscapes, particularly if the world is redesigned around:

- Square tiles
- Isometric tiles
- Large pre-rendered chunks
- Texture-atlas terrain
- Static decoration layers

Your existing terrain is built from connected cells and rendered as a height-aware 3D surface. A Phaser version would need to reinterpret that data.

Possible representations include:

1. Top-down hexagonal cells
2. Isometric diamond tiles
3. Pre-rendered landscape chunks
4. A single GPU-driven terrain texture
5. Layered biome masks with vegetation sprites

A direct one-object-per-cell implementation should be avoided. The map should be rendered in chunks or GPU tilemap layers.

## Animals and animation

The current simple animals could translate surprisingly well into 2D vector-style sprites.

For example:

- Valley Grazer: rounded gold body, smaller round head
- Ridge Hunter: slender purple body, triangular head and tail
- Expressions: separate face layer
- Pregnancy: body-shape variation
- Maturity: scaled body variants
- Drinking: head-lowering sprite animation
- Grazing: repeated head movement
- Mating: purpose-built paired animation
- Hunting: sprint, stalk and attack frames
- Birth: staged body and offspring animation

This could improve visual consistency. Instead of calculating numerous 3D body parts, Phaser would assemble or animate textures.

The cost is asset production. If eight movement directions, five maturity stages, two sexes, pregnancy variants and many actions are combined naively, the number of sprite variations becomes enormous.

A modular sprite system would be preferable:

```
Animal
├── Species body
├── Maturity scale or body variant
├── Sex-dependent detail
├── Pregnancy body modifier
├── Face layer
├── Head direction
├── Tail layer
├── Action animation
└── Temporary injury or state effects
```

## Symbols and thought bubbles

Phaser would be a strong fit for the symbol system.

The current symbols already resemble 2D game assets:

- Identity rails
- Expressions
- Thought clouds
- Public signals
- Action badges
- Health and reserve bars
- Selection rings
- Direction arrows
- Perception regions

In Phaser these could use:

- Containers
- Sprites
- Graphics objects
- Bitmap text
- Render textures
- Camera-ignore layers
- Screen-space scaling

This would make it easier to enforce consistent size and layout. However, Phaser alone would not solve semantic inconsistency or overcrowding. The existing central symbol registry and presentation-priority rules would still be necessary.

## Laboratory and interface

The Laboratory should probably remain HTML and CSS even in a Phaser version.

HTML remains better for:

- Long diagnostic text
- Tabs
- Collapsible sections
- Forms
- Search
- Scrollable reports
- Save management
- Settings
- Accessibility
- Copying benchmark output

Phaser should render the world and compact world-space overlays. The existing DOM should render the Laboratory and menus.

Recommended division:

```
Browser application
├── Phaser canvas
│   ├── Terrain
│   ├── Animals
│   ├── World symbols
│   ├── Diagnostic geometry
│   └── Map presentation
├── HTML interface
│   ├── Main menu
│   ├── Settings
│   ├── Selected-organism panel
│   ├── Laboratory
│   ├── Saves
│   └── Benchmark reports
└── Simulation worker
    ├── Entities
    ├── Ecology
    ├── Perception
    ├── Memory
    ├── Decisions
    └── Reproduction
```

## Web Worker architecture

Moving the simulation into a Web Worker remains more important than adopting Phaser.

The preferred architecture would be:

```
Simulation Worker
        │
        │ authoritative snapshots
        ▼
Presentation adapter
        │
        ├── Phaser world objects
        └── HTML Laboratory
```

The worker should send:

- Changed entity positions
- Animation states
- Expressions
- Public signals
- Selected-entity diagnostic data
- Changed terrain or vegetation chunks
- Births and deaths
- Group changes
- Weather and seasonal state

It should not send the entire world every frame.

Phaser’s scene update must not become the authoritative simulation tick. Otherwise rendering frame rate and ecological behaviour could become coupled again.

## Scene structure

A Phaser version could use scenes effectively:

```
BootScene
├── Load fonts, atlases and core assets
└── Restore user settings

MainMenuScene
├── Background gallery
├── Continue
├── New world
├── Save/load
├── Settings
└── Screenshot showcase

WorldScene
├── Terrain layers
├── Animals
├── Vegetation
├── Water
├── Weather
└── Selection

OverlayScene
├── Identity
├── Expressions
├── Signals
├── Actions
├── Thoughts
└── Diagnostics

ScreenshotShowcaseScene
├── Deterministic scenarios
├── Camera presets
└── Presentation controls
```

The Laboratory could remain outside those scenes as HTML.

## Migration difficulty

### Logic migration

Difficulty: medium.

Much of the simulation logic can be reused after removing direct DOM and Three.js dependencies.

### Renderer migration

Difficulty: very high.

Most existing Three.js presentation code would be discarded or rewritten.

### UI migration

Difficulty: low if HTML is retained.

### Art migration

Difficulty: medium to high.

The animals, expressions and icons would require sprite or vector-texture pipelines.

### Testing migration

Difficulty: medium.

The existing deterministic logic tests can largely survive. Renderer tests and browser screenshots would need replacement.

## Suggested migration process

If Phaser is explored, it should begin with a disposable prototype rather than a full rewrite.

### Phase 1: proof of concept

Build a separate Phaser 4 prototype containing:

- One small map
- Twenty herbivores
- Four carnivores
- Top-down or fixed isometric camera
- Movement interpolation
- Selection
- One expression
- One thought cloud
- One public signal
- One action badge
- Physiology bars
- A water source
- Grazing, drinking and pursuit

Use recorded snapshots from the existing simulation rather than migrating decisions.

### Phase 2: presentation benchmark

Measure:

- 22 entities
- 100 entities
- 250 entities
- 500 entities
- Low and high vegetation
- All symbols hidden
- All symbols visible
- Selected-entity diagnostics
- Fog of war

This establishes whether Phaser materially improves rendering.

### Phase 3: simulation boundary

Extract the authoritative simulation into renderer-independent modules or a Worker.

Run the same simulation with:

- Existing Three.js renderer
- Phaser prototype renderer
- Headless test runner

If the results remain deterministic, the architecture is healthy.

### Phase 4: migration decision

Proceed only if the Phaser version:

- Delivers the desired visual identity
- Improves frame time
- Reduces renderer complexity
- Handles world-space symbols cleanly
- Supports the intended map scale
- Remains readable at normal observation zoom
- Does not require rebuilding every feature simultaneously

## Risk from Phaser 4’s age

Phaser 4 is now released and actively updated, but it is still a comparatively new major version. Its renderer, filters, cameras and internal rendering architecture differ substantially from Phaser 3. The official changelog describes a replaced rendering pipeline and breaking changes across several systems. [Phaser 4.0 changelog](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md)

For a new prototype, Phaser 4 is the sensible version to evaluate. For a large production rewrite, the project should pin an exact version and avoid depending heavily on undocumented internals.

## Would Phaser solve the current problems?

|Current concern|Would Phaser help?|
|---|---|
|Vegetation draw calls|Yes, if converted to batched sprites or GPU tile layers|
|Symbol scaling|Yes|
|Thought-bubble placement|Yes|
|Icon sharpness|Yes, with vector or high-resolution texture generation|
|Menu and scene organization|Yes|
|2D screenshot composition|Yes|
|Browser CPU limits|Not directly|
|Perception cost|No|
|Spatial-query cost|No|
|Memory and relationship cost|No|
|Simulation tick stalls|No|
|Large DOM Laboratory updates|No, unless separately redesigned|
|True 3D terrain|No|
|Free camera rotation|Not in the same form|
|3D animal animation|No|
|Desktop-native performance|No; Phaser remains web technology|

## Overall judgement

### Technical feasibility

High for a rewritten 2D version.

Medium for an isometric version.

Low for a faithful reproduction of the current 3D presentation.

### Expected performance benefit

Potentially substantial for rendering if the scene becomes sprite- and tile-based.

Limited for simulation CPU unless perception and simulation are independently redesigned.

### Expected development cost

A major rewrite, especially for rendering and art.

### Strategic value

Strong if the project is intentionally becoming a 2D simulation game.

Weak if the goal is simply to make the current Three.js version faster.

## Final recommendation

Phaser should be treated as a possible new presentation direction, not as an upgrade to the current engine.

The strongest Phaser version of Living Laboratory would be:

> A fixed-isometric, sprite-based simulation game with a Worker-based authoritative simulation core, a Phaser world renderer, and the existing HTML-style Laboratory interface.

Before committing, create one small vertical slice showing a predator pursuing a separated juvenile across an isometric landscape. Include selection, fog of war, expressions, thought bubbles and diagnostic overlays. That one scene would expose most of the difficult questions: visual identity, depth sorting, readability, animation requirements and performance.

If retaining the current freely rotatable low-poly 3D world is essential, continuing with Three.js—or eventually moving to Godot or a custom native 3D renderer—would be more appropriate than Phaser.