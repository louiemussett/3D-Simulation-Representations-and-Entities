# Feasibility report: creating Living Laboratory with Electron

No implementation was performed.

## Executive conclusion

Electron is highly feasible for Living Laboratory, but it should be understood as a desktop application shell—not a new game or rendering engine.

An Electron version could preserve almost all of the current project:

- Three.js renderer
- HTML and CSS interface
- JavaScript simulation
- Laboratory
- Main menu
- Screenshot showcase
- Symbols and overlays
- Saves
- Benchmarks
- Existing tests

This makes Electron substantially easier to adopt than Phaser, Godot or a native C++ rewrite.

However:

> Simply opening the existing project inside Electron would not materially improve simulation or rendering performance.

Electron embeds Chromium. The Three.js renderer, DOM interface and synchronous JavaScript simulation would still operate under essentially the same web-platform constraints. Electron becomes valuable when its process architecture is used properly: rendering remains in the Chromium renderer while simulation and perception move into a separate utility process or Worker.

The strongest architecture would be:

```
Electron desktop application
├── Main process
│   ├── Window management
│   ├── File dialogs
│   ├── Save locations
│   ├── Screenshots
│   ├── Hardware information
│   └── Application lifecycle
├── Simulation utility process
│   ├── Clock and seasons
│   ├── Animals and physiology
│   ├── Perception
│   ├── Decisions
│   ├── Memory and relationships
│   ├── Reproduction
│   └── Ecology
└── Renderer process
    ├── Three.js world
    ├── Animals and animation
    ├── Symbols and overlays
    ├── Main menu
    ├── Selected-organism panel
    └── Laboratory
```

Overall assessment:

|Question|Assessment|
|---|---|
|Can the current project become an Electron application?|Yes, readily|
|Is a complete rewrite necessary?|No|
|Can the current Three.js presentation remain?|Yes|
|Would Electron alone increase FPS?|Probably not|
|Could it improve UI responsiveness?|Yes, with simulation separation|
|Could it support a later C++ simulation core?|Yes|
|Could it produce a conventional Windows application?|Yes|
|Is it a sensible near-term direction?|Yes, if a desktop release is desired|

## What Electron actually is

Electron combines Chromium with Node.js to create desktop applications using web technology.

A typical application contains:

- A main process that manages windows, application lifecycle and operating-system access
- One or more renderer processes that display HTML, CSS, JavaScript and WebGL content
- Optional utility processes for CPU-heavy or isolated work
- Preload scripts that expose a controlled API to the renderer

Electron’s renderer behaves like a modern browser page. Therefore, your existing HTML, CSS, JavaScript and Three.js code are fundamentally compatible. [Official Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)

Electron is not:

- A graphics engine
- A simulation engine
- A replacement for Three.js
- A faster JavaScript runtime specifically designed for games
- Automatically multi-threaded
- Automatically native in performance

It packages a Chromium application as desktop software and provides controlled access to desktop capabilities.

## Compatibility with the current project

### Rendering: very high compatibility

The existing project uses Three.js and WebGL. These can continue running inside Electron’s renderer process.

You could retain:

- Low-poly terrain
- Three-dimensional animals
- Rotatable camera
- Vegetation rendering
- Water
- Expressions
- Thought bubbles
- Identity rails
- Public signals
- Action symbols
- Physiology bars
- Fog of war
- Perception sectors
- Personal-space overlays
- Contact rings
- Screenshot showcase
- Menu backgrounds

This is Electron’s largest advantage over Phaser: the current visual system does not need to be redesigned as 2D.

### Interface: very high compatibility

The current DOM-based interface is also directly compatible:

- Strategic Overview
- Selected Organism panel
- Laboratory tabs
- Graphics and interface settings
- New-world screen
- Saves
- Benchmark reports
- Legend
- Entity display guide
- Main menu

Only desktop-specific integration would need to be added.

### Simulation: compatible, but should be reorganized

The simulation is JavaScript and can initially run unchanged in Electron.

That would make the first desktop build relatively straightforward, but it would retain the current architectural limitation: simulation, perception, UI and presentation compete for renderer-process time.

The better long-term step is to move authoritative simulation code away from the renderer.

## Three Electron implementation levels

### Level 1: minimal desktop wrapper

This version would package the existing application almost unchanged.

```
Electron main process
└── BrowserWindow
    └── Existing Living Laboratory application
```

It would add:

- Desktop executable
- Application icon
- Full-screen and windowed modes
- Native file dialogs
- Proper save folders
- Native screenshots
- Desktop settings
- Possibly Steam distribution later

Advantages:

- Least development work
- Current project remains recognizable
- Low migration risk
- Existing browser build could remain available
- Fastest route to a desktop executable

Disadvantages:

- Little or no simulation performance improvement
- Renderer can still freeze during heavy ticks
- Chromium and Node increase memory usage
- Current architectural problems remain
- Browser-like debugging and rendering constraints remain

Feasibility: very high.

Strategic value: moderate.

### Level 2: Electron with a separated simulation process

This is the recommended version.

Electron supports utility processes running in Node.js. The official documentation specifically identifies CPU-intensive and crash-prone work as an appropriate use case. Utility processes can communicate through message ports. [Electron utility-process documentation](https://www.electronjs.org/docs/latest/api/utility-process), [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)

Architecture:

```
Main process
├── Creates desktop window
├── Starts simulation process
├── Handles saves and screenshots
└── Coordinates shutdown

Simulation utility process
├── Runs authoritative ticks
├── Maintains entities
├── Runs perception and decisions
├── Produces snapshots
└── Handles long time skips

Renderer process
├── Receives presentation snapshots
├── Interpolates positions
├── Renders Three.js world
└── Updates visible UI
```

Advantages:

- Simulation spikes no longer directly block rendering.
- UI can remain responsive during demanding ticks.
- Long deterministic time skips can run off the renderer.
- Simulation crashes can be isolated.
- Benchmarking becomes more accurate.
- Renderer frame rate and simulation tick rate become independent.
- The simulation can eventually be replaced by native code without replacing the interface.

Disadvantages:

- Significant architectural work
- Current simulation code must be separated from Three.js and DOM state.
- State communication must be designed carefully.
- Copying huge world snapshots can become expensive.
- Debugging spans multiple processes.
- Saves require a clear ownership model.
- Determinism must be preserved across the message boundary.

Feasibility: high.

Strategic value: very high.

### Level 3: Electron with a native simulation core

This version keeps Electron and Three.js for presentation but moves performance-critical simulation systems into C++, Rust or another native language.

Electron supports native Node modules, allowing native libraries to be called by JavaScript. Electron’s documentation identifies compute-intensive logic as a use case for native addons. [Native code and Electron](https://www.electronjs.org/docs/latest/tutorial/native-code-and-electron)

Possible native systems include:

- Spatial indexing
- Line-of-sight queries
- Neighbour queries
- Perception
- Pathfinding
- Group clustering
- Ecological accounting
- Large memory searches
- Bulk physiology updates
- Save compression

Advantages:

- Much greater performance ceiling
- Current Three.js presentation can remain
- Native code can be introduced selectively
- Expensive systems can use multiple CPU threads
- Suitable for much larger populations
- Provides a gradual route toward a native simulation core

Disadvantages:

- Native compilation toolchains are required.
- Windows, macOS and Linux need different builds.
- Electron upgrades can require rebuilding native modules because Electron has its own ABI. [Electron native-module guidance](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- Debugging across JavaScript and native code becomes harder.
- Passing large data structures across the boundary may cancel some performance gains.
- Development and release complexity increase substantially.

Feasibility: medium to high.

Strategic value: potentially high, but only after profiling.

## Expected performance

### Rendering performance

Electron will use Chromium and WebGL, like the current browser version.

Therefore, the same rendering costs remain:

- Three.js draw calls
- Vegetation
- Animal geometry
- Transparent overlays
- Thought bubbles
- Icon textures
- Fog of war
- High render resolution
- Contact shadows
- DOM updates
- GPU fill rate

An Electron window might behave somewhat more consistently because:

- The Chromium version is controlled by the application.
- Browser extensions are absent.
- There are no unrelated tabs.
- Power and GPU preferences can be managed more deliberately.
- The application can default to dedicated-GPU usage where supported.
- Window and full-screen behaviour are under application control.

But this is not equivalent to a fundamentally faster renderer.

A scene that reaches 55 FPS in Chrome should not be expected to become 120 FPS simply because it is placed in Electron.

### Simulation performance

A minimal Electron wrapper will not improve the synchronous simulation loop.

The meaningful gain comes from moving simulation and perception to a utility process or Worker.

This can improve:

- UI responsiveness
- Camera smoothness
- Menu interaction
- Laboratory scrolling
- Stable render pacing
- Background benchmark execution
- Deterministic time skips

It may not make each simulation tick itself faster. Instead, it stops expensive ticks from blocking drawing and input.

To make individual ticks faster, the project still needs:

- Spatial-query optimization
- Perception caching
- Staggered sensing
- Data-oriented structures
- Reduced allocation
- Better memory indexing
- Worker parallelism
- Possibly native modules

Electron’s own performance guide warns against blocking either the main or renderer process. General browser and Node performance practices still apply. [Official Electron performance guide](https://www.electronjs.org/docs/latest/tutorial/performance)

## Memory usage

Electron applications typically use more baseline memory than a lightweight native program because the application ships and runs Chromium and Node.js.

Living Laboratory would probably create several processes:

- Electron main process
- GPU process
- Renderer process
- Simulation utility process
- Possibly additional Chromium service processes

This is not necessarily prohibitive on a modern desktop, but it should be expected.

A reasonable early assumption would be:

- Electron baseline: hundreds of megabytes are possible
- Three.js assets and geometry: additional GPU and system memory
- Large worlds: substantial typed-array and entity storage
- Imported menu backgrounds: persistent disk storage plus active texture memory
- High-resolution icon textures: potentially significant GPU memory
- Simulation snapshots: additional memory if copied rather than transferred

The benchmark should therefore report process-level memory, not just JavaScript heap usage.

## Desktop save system

Electron would improve save handling substantially.

Instead of relying primarily on IndexedDB and browser downloads, the application could use conventional files:

```
Documents
└── Living Laboratory
    ├── Saves
    │   ├── World 1.rsssave
    │   └── Valley Study.rsssave
    ├── Screenshots
    ├── Benchmarks
    ├── Backgrounds
    ├── Exports
    └── Logs
```

Benefits:

- Named save files
- Multiple save slots
- Autosave rotation
- Backup saves
- Clear error messages
- Direct import/export
- Save-folder browsing
- Large files without browser-storage quotas
- Crash-recovery files
- Benchmark reports written directly to disk
- Easier user-created menu backgrounds
- Portable worlds

The renderer should not receive unrestricted filesystem access. File operations should be exposed through a narrow preload API.

## Screenshots and background images

Electron is particularly attractive for your screenshot workflow.

It could provide:

- Native screenshot button
- Configurable screenshot folder
- PNG or JPEG output
- Timestamped filenames
- Automatic HUD suppression
- Scenario and seed in file metadata
- High-resolution off-screen capture
- Supersampling
- Capture at resolutions larger than the current window
- Direct “Use as menu background” action
- Background-image library stored on disk
- Open screenshots folder
- Delete and rename screenshots
- Screenshot showcase presets

The main menu could read images from a dedicated background directory rather than storing large files in IndexedDB.

A strong workflow would be:

```
Screenshot Showcase
        ↓
Capture image
        ↓
Save to Screenshots
        ↓
Add to menu-background library?
        ↓
Available immediately in Settings
```

## Hardware detection

Electron can provide more consistent hardware and system reporting than ordinary browser JavaScript.

Potential benchmark metadata includes:

- Operating system
- CPU model
- Logical core count
- Total system memory
- Process memory
- GPU information
- Chromium version
- Electron version
- Node.js version
- Display resolution
- Device scale factor
- Dedicated versus integrated GPU indication
- WebGL renderer and limits
- Save-disk availability

This would make performance reports more useful.

Care is still required because GPU identification can vary by operating system and driver.

## Windowing and display options

Electron can offer conventional game-like display settings:

- Windowed mode
- Borderless fullscreen
- Exclusive-style fullscreen where supported
- Resolution selection
- VSync behaviour
- Frame cap
- Monitor selection
- Window position
- Remembered window size
- High-DPI scaling
- UI scale
- Font scale
- Screenshot resolution
- Background image directory
- GPU preference
- Minimize when unfocused
- Pause simulation when unfocused
- Continue simulation in background

The application could also separate the Laboratory into another window, although that should be considered carefully.

Possible configuration:

```
Main window
└── Simulation and compact controls

Optional Laboratory window
└── Detailed diagnostics and charts
```

This could be useful on two monitors, but synchronizing selection and diagnostics across windows would add complexity.

## Menu and operating-system integration

Electron would support:

- Native application icon
- Taskbar integration
- Recent saves
- Native file dialogs
- Drag-and-drop save loading
- Full-screen shortcuts
- Native application menu
- About screen
- Crash logs
- Desktop shortcuts
- Protocol links
- Association with `.rsssave` files
- Steam launch integration
- Auto-update support

Electron’s distribution documentation covers packaging, signing and auto-updating desktop builds. [Electron distribution overview](https://www.electronjs.org/docs/latest/tutorial/distribution-overview)

## Security design

Electron applications need an explicit security boundary.

Recommended configuration:

```
Renderer
├── nodeIntegration: false
├── contextIsolation: true
├── sandbox: true where practical
└── no unrestricted filesystem access

Preload API
├── saveWorld()
├── loadWorld()
├── listSaves()
├── captureScreenshot()
├── listMenuBackgrounds()
├── deleteMenuBackground()
├── getHardwareReport()
└── openFolder()
```

The renderer should not receive the complete Electron IPC API or arbitrary filesystem paths.

Electron’s process model recommends using preload scripts and `contextBridge` for controlled communication between privileged and renderer contexts. [Official Electron process-model guidance](https://www.electronjs.org/docs/latest/tutorial/process-model)

## Simulation-to-renderer communication

This is the most important technical design problem.

A poor design would send the complete simulation every frame:

```
500 animals
× complete memories
× relationships
× priorities
× sensory buffers
× terrain
× ecology
× 60 frames per second
```

That would waste CPU time and memory.

A better design sends compact presentation snapshots:

```
Presentation snapshot
├── Clock and weather
├── Changed terrain chunks
├── Visible animals
│   ├── ID
│   ├── Position
│   ├── Heading
│   ├── Pose
│   ├── Expression
│   ├── Public signal
│   └── Notable action
├── Birth and death events
├── Group markers
└── Selected-entity diagnostic snapshot
```

Suggested cadence:

- Simulation process: authoritative tick cadence
- Position snapshots: perhaps 10–20 times per second
- Renderer: interpolate at display frame rate
- Laboratory summary: 2–5 times per second
- Minimap: 1–2 times per second
- Full selected-entity diagnostics: on selection or meaningful change
- Save snapshot: only on request or autosave interval

Transferable typed arrays could be used for large position batches.

## Determinism

The simulation should remain deterministic regardless of renderer frame rate.

The utility process should own:

- Seeded randomness
- Tick count
- Animal update order
- Occupancy
- Spatial index
- Reproduction resolution
- Death
- Group changes
- Weather
- Ecology

The renderer should own only:

- Interpolation
- Camera
- Animation pose
- Temporary visual effects
- UI state
- Selected overlays
- Presentation culling

Electron makes this separation natural, but it does not enforce it automatically.

## Packaging and distribution

Electron can package Living Laboratory as:

- Windows installer
- Portable Windows application
- macOS application
- Linux packages
- Steam-distributed desktop game

The Electron documentation recommends Electron Forge for packaging and distribution. [Official application-packaging guidance](https://www.electronjs.org/docs/latest/tutorial/application-distribution)

Production distribution also requires consideration of:

- Code signing
- Application identity
- Installer creation
- Architecture builds
- Auto-update infrastructure
- Save compatibility
- Crash reporting
- License notices
- GPU-driver differences
- Antivirus false positives
- Platform testing

Electron’s packaged application will be much larger than the current web project because Chromium and Node are included.

## Native C++ expansion

Electron offers a credible intermediate path toward a C++ simulation core.

Possible progression:

```
Stage 1
Electron + current JavaScript simulation

Stage 2
Electron + JavaScript utility-process simulation

Stage 3
Profile CPU hotspots

Stage 4
Move spatial queries and perception to native module

Stage 5
Move authoritative simulation core to C++

Stage 6
Electron remains presentation and Laboratory shell
```

This would allow gradual migration rather than rewriting everything at once.

However, native modules introduce ABI and release-management work. Electron’s documentation notes that native modules generally need to be rebuilt for Electron and often rebuilt after Electron upgrades. [Official native-module documentation](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)

A separate native simulation executable communicating through IPC is another option. It can be easier to decouple from Electron’s ABI than an in-process addon, although communication is more explicit.

## Comparison with the current browser version

|Capability|Browser|Electron|
|---|---|---|
|Current Three.js renderer|Yes|Yes|
|Existing HTML UI|Yes|Yes|
|Requires visual rewrite|No|No|
|Native executable|No|Yes|
|Conventional save folders|Limited|Yes|
|Native file dialogs|Limited|Yes|
|Controlled Chromium version|No|Yes|
|Automatic FPS improvement|No|No|
|Separate simulation process|Worker|Worker or utility process|
|Native modules|WebAssembly mainly|Native Node modules or separate executable|
|Application auto-update|Website deployment|Desktop updater|
|Steam packaging|Indirect|Practical|
|Baseline memory|Lower|Higher|
|Browser accessibility|Immediate|Installation required|
|Web distribution|Excellent|Not applicable|
|Offline desktop use|Possible|Excellent|

## Comparison with a complete native rewrite

Electron’s main advantage is preserving the existing project.

A complete C++ application could potentially offer:

- Lower memory use
- Greater control
- Higher simulation throughput
- Native multithreading
- Direct GPU APIs
- No Chromium dependency

But it would require rebuilding:

- Renderer
- UI
- Text layout
- Input
- Menus
- Save management
- Laboratory
- Icons
- Screenshot system
- Camera
- Platform integration

Electron gives up some efficiency in return for greatly reduced migration cost.

## Principal risks

### Electron is mistaken for a performance fix

This is the largest risk. Packaging the current page will not solve synchronous simulation cost.

### Main process becomes overloaded

The main process should not run simulation ticks. Blocking it can make the entire application feel broken.

### Renderer remains overloaded

If the simulation stays in the renderer, camera and UI responsiveness remain vulnerable.

### Excessive IPC

Sending too much state too frequently can become a new bottleneck.

### Large memory footprint

Chromium, Three.js, snapshots and high-resolution textures can consume substantial memory.

### Security shortcuts

Enabling unrestricted Node access in the renderer would be convenient but unsafe and architecturally poor.

### Native-module maintenance

C++ or Rust addons require compilation, platform builds and Electron-version compatibility.

### Web version divergence

Desktop-only APIs can cause the Electron and browser versions to drift unless a shared abstraction is maintained.

## Recommended architecture

```
Living Laboratory Desktop
│
├── Electron main process
│   ├── Creates BrowserWindow
│   ├── Manages menus and lifecycle
│   ├── Owns save and screenshot paths
│   ├── Starts simulation utility process
│   └── Exposes restricted IPC handlers
│
├── Preload bridge
│   ├── Saves API
│   ├── Screenshot API
│   ├── Hardware API
│   ├── Background-library API
│   └── Simulation-control API
│
├── Renderer
│   ├── Three.js presentation
│   ├── HTML/CSS interface
│   ├── Main menu
│   ├── Laboratory
│   ├── Symbols
│   └── Snapshot interpolation
│
└── Simulation utility process
    ├── Authoritative world
    ├── Fixed ecological clock
    ├── Spatial index
    ├── Perception
    ├── Decisions
    ├── Physiology
    ├── Memory
    ├── Social systems
    ├── Reproduction
    ├── Predation
    └── Snapshot production
```

## Recommended implementation sequence

### Phase 1: package without changing behaviour

- Create an Electron entry point.
- Load the current application locally.
- Add window lifecycle.
- Add production and development modes.
- Preserve all current tests.
- Confirm graphics and saves behave identically.

Purpose: prove desktop compatibility.

### Phase 2: add desktop services

- Native save and load dialogs
- Save folder
- Screenshot folder
- Menu-background library
- Hardware report
- Full-screen settings
- Window persistence
- Crash logs

Purpose: provide genuine desktop value.

### Phase 3: create the simulation boundary

- Separate authoritative simulation data from presentation state.
- Define commands and snapshot formats.
- Run the same simulation headlessly.
- Preserve deterministic tests.

Purpose: prepare for process separation.

### Phase 4: move simulation into a utility process

- Start the world outside the renderer.
- Transfer compact snapshots.
- Interpolate positions in Three.js.
- Rate-limit Laboratory updates.
- Keep camera and UI responsive.

Purpose: solve the principal architectural problem.

### Phase 5: profile again

Benchmark:

- 25 entities
- 50 entities
- 100 entities
- 250 entities
- 500 entities
- Low through ultra presentation settings
- Simulation-only mode
- Renderer-only replay mode
- Combined application

Purpose: identify whether CPU, GPU or IPC is now limiting performance.

### Phase 6: consider native acceleration

Only move systems to C++ or Rust if profiling demonstrates a meaningful need.

Likely first candidates:

1. Neighbour queries
2. Line of sight
3. Perception scoring
4. Pathfinding
5. Group clustering
6. Bulk physiology

## Feasibility ratings

|Area|Feasibility|Difficulty|
|---|---|---|
|Package current project|Very high|Low|
|Preserve Three.js visuals|Very high|Low|
|Preserve Laboratory|Very high|Low|
|Native saves and screenshots|Very high|Low–medium|
|Desktop settings and menus|Very high|Low–medium|
|Move simulation to utility process|High|High|
|Maintain browser version too|High|Medium|
|Introduce native C++ modules|Medium–high|High|
|Achieve major FPS gains from wrapper alone|Low|—|
|Achieve better responsiveness through separation|High|High|
|Replace browser limitations completely|No|—|

## Final recommendation

Electron is one of the most practical directions available for the current project because it does not require discarding the Three.js renderer or HTML Laboratory.

It is best understood as a staged path:

> First make Living Laboratory a conventional desktop application. Then use Electron’s utility-process architecture to separate simulation from rendering. Only after profiling should selected simulation systems move into C++ or Rust.

If your priority is retaining the current visual design while gaining desktop saves, screenshots, distribution and a path toward a native simulation core, Electron is a strong choice.

If your only objective is higher FPS, Electron by itself is not sufficient. The performance benefit would come from the architectural work enabled inside Electron—not from the Electron wrapper itself.