import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { entityConstellationCardProfile } from "../src/entity-constellation-card-layout.js";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const reference = readFileSync(new URL("../src/laboratory-reference.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("world symbols share one camera-facing ownership constellation", () => {
  assert.match(app, /resolveVisibleEntityConstellations\(visibleEntries\)/);
  assert.match(app, /root\.name = "entity-constellation"/);
  assert.match(app, /createAnimalTransientParts\(group, constellationRoot/);
  assert.match(app, /applyEntityConstellationLayout\(rendered, a, state\)/);
  for (const slot of ["face", "signal", "actionBadge", "thought", "predictionThought", "identityPanel"]) assert.match(app, new RegExp(`parts\\.${slot}|${slot}`));
});

test("ownership stays separate from semantic colours and authoritative rings", () => {
  const creator = app.match(/function createAnimalConstellation\(group\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(creator, /geos\.ring/);
  assert.match(app, /tether\.material\.color\.set\(layout\.style\.accent\)/);
  assert.match(app, /actionSymbol\(a, state\.action\.key\)\?\.colour/);
  assert.match(reference, /semantic colours[\s\S]*remain unchanged/i);
});

test("receiver links require retained communication evidence and relations require explicit targets", () => {
  assert.match(app, /record\.communicatedBy === speaker\.id/);
  assert.match(app, /\["hearing", "visual-signal"\]\.includes\(record\.channel\)/);
  assert.match(app, /targetId = state\.action\.target/);
  assert.match(app, /relationalArrow\(actorLayout, targetLayout/);
  assert.match(reference, /retained sensory evidence confirms that receiver observed the call/i);
});

test("guide and diagnostics expose the automatic ownership system", () => {
  assert.match(html, /data-entity-constellation-guide/);
  assert.match(html, /class="guide-identity-main"/);
  assert.match(html, /class="guide-pregnancy">pregnant · 62%/);
  assert.match(html, /class="guide-identity-caption">identity · sex · life stage/);
  assert.match(reference, /data-reference-ownership-constellation/);
  assert.match(app, /entityConstellationState:/);
  assert.match(app, /mode: layout\.mode/);
  assert.match(app, /selected: layout\.selected, cinemaInstrumentOwner: Boolean\(projection\.cinemaInstrumentOwner\), hovered: layout\.hovered/);
});

test("observer diagnostic guides own wheel input and reflow their visual aid without overlapping labels", () => {
  assert.match(styles, /#observer-hud\{pointer-events:auto\}/);
  assert.match(styles, /#observer-hud:not\(\.is-minimised\)\{[^}]*overflow-y:auto[^}]*overscroll-behavior:contain/);
  assert.match(styles, /\.world-symbol-key\[open\][^{]*\{[^}]*overflow-y:\s*auto[^}]*touch-action:\s*pan-y/);
  assert.match(styles, /\.entity-overlay-guide\[open\][^{]*\{[^}]*overflow-y:\s*auto[^}]*touch-action:\s*pan-y/);
  assert.match(styles, /\.guide-world-layout\s*\{[^}]*display:grid[^}]*height:auto/);
  assert.match(styles, /\.guide-card-row\s*\{[^}]*grid-template-columns:max-content minmax\(0,1fr\) max-content/);
  assert.match(styles, /\.guide-identity-rail small\s*\{[^}]*white-space:normal[^}]*overflow-wrap:anywhere/);
  assert.doesNotMatch(styles, /\.guide-identity-rail small\s*\{[^}]*white-space:nowrap/);
});

test("the one per-animal ownership-panel texture stays bounded independently of icon quality", () => {
  const creator = app.match(/function createOwnershipPanelSprite\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(creator, /only ownership-panel surface/i);
  assert.match(creator, /ENTITY_CONSTELLATION_CARD_GEOMETRY\.summary\.canvas/);
  assert.match(creator, /iconCanvas\(geometry\.width, geometry\.height, \{ maximumQuality: 1 \}\)/);
  assert.match(creator, /map\.generateMipmaps = false/);
  assert.match(creator, /map\.minFilter = THREE\.LinearFilter/);
});

test("the public renderer uses a square face bay, fixed identity bay and wide cue artwork", () => {
  const panel = entityConstellationCardProfile().panel;
  assert.equal(panel.screenSize.width, 314);
  assert.equal(panel.screenSize.height, 82);
  assert.equal(panel.sideCells.expressionCell.width, 82);
  assert.equal(panel.sideCells.expressionCell.height, 82);
  assert.equal(panel.sideCells.outwardCell.width, 104);
  assert.equal(panel.sideCells.outwardCell.height, 82);
  assert.equal(panel.sideCells.outwardCell.left - panel.sideCells.expressionCell.right, 128);
  assert.equal(panel.sideCells.expression.width, 66);
  assert.equal(panel.sideCells.expression.height, 66);
  assert.equal(panel.sideCells.outward.width, 92);
  assert.equal(panel.sideCells.outward.height, 68);
  assert.equal(panel.sideCells.action.width / panel.sideCells.action.height, 92 / 68);
  const badge = app.match(/function semanticBadgeCanvas\(symbol,[\s\S]*?\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(badge, /iconCanvas\(184, 136, \{ documentation \}\)/);
  assert.match(badge, /roundRect\(5, 5, 174, 126, symbol\.channel === "public-signal" \? 24 : 12\)/);
});

test("an animal selection exclusively admits its integrated instrument and suppresses other panels", () => {
  const resolver = app.match(/function resolveVisibleEntityConstellations\(entries\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const applier = app.match(/function applyEntityConstellationLayout\(rendered, a, state\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(resolver, /projection\.layoutProfile = constellationResolverProfile\(projection\.instrumentOwner \? cardProfile\.selected : cardProfile\.public, panelSettingScale\(projection\.instrumentOwner\)\)/);
  assert.match(resolver, /const panelFocus = entityConstellationPanelFocus\(\)/);
  assert.match(resolver, /if \(panelFocus\.exclusive\) budgetOptions\.exclusiveFocusId = panelFocus\.ownerId/);
  assert.match(resolver, /selectEntityConstellationBudget\(onScreenProjected, budgetOptions\)/);
  assert.match(resolver, /reason: panelFocus\.reason/);
  assert.match(applier, /panelProfile = integratedInstrument \? cardProfile\.selected : cardProfile\.public/);
  assert.match(applier, /layout\.detailLevel === "instrument"/);
});

test("Cinema chooses one presentation-only panel owner from camera authority", () => {
  const cinemaOwner = app.match(/function cinemaPanelSubjectId\(shot = movieState\.shot\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const focus = app.match(/function entityConstellationPanelFocus\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(cinemaOwner, /cinemaPanelAuthority\(shot\)/);
  assert.match(cinemaOwner, /authority\.subjectIds/);
  assert.match(cinemaOwner, /animal\?\.alive/);
  assert.doesNotMatch(cinemaOwner, /selectedId\s*=/);
  assert.match(focus, /movieState\.active[\s\S]*exclusive: true[\s\S]*cinemaPanelSubjectId\(\)[\s\S]*cinema-focus/);
  assert.match(focus, /animal\?\.alive[\s\S]*selection-focus[\s\S]*exclusive: false/);
  assert.match(app, /subjectMode === "world"[\s\S]*ids: \[\], semanticRoleIds: \[\], worldSubject: true/);
  assert.match(app, /showName = !panelFocus\.exclusive && !integratedInstrument/);
  assert.match(app, /visibleEntityNameplates:/);
});

test("one constellation root owns the two integrated instrument surfaces", () => {
  const creator = app.match(/function createAnimalConstellation\(group\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(creator, /const instrumentBackdrop =/);
  assert.match(creator, /const instrumentMetrics =/);
  assert.match(creator, /root\.add\(instrumentBackdrop\)/);
  assert.match(creator, /root\.add\(instrumentMetrics\)/);
  assert.match(creator, /return \{[^\n]*instrumentBackdrop[^\n]*instrumentMetrics/);
  assert.equal((creator.match(/const instrumentBackdrop =/g) || []).length, 1);
  assert.equal((creator.match(/const instrumentMetrics =/g) || []).length, 1);
});

test("inactive instruments release their large backing buffers", () => {
  const release = app.match(/function releaseInstrumentPanelLayer\(sprite\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const hide = app.match(/function hideEntityConstellation\(rendered\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const applier = app.match(/function applyEntityConstellationLayout\(rendered, a, state\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(release, /canvas\.width = canvas\.height = 1/);
  assert.match(release, /map\.needsUpdate = true/);
  assert.match(hide, /releaseInstrumentPanelLayers\(parts\)/);
  assert.match(applier, /else releaseInstrumentPanelLayers\(parts\)/);
  assert.match(applier, /instrumentBackdrop\.visible = instrumentMetrics\.visible = false;\s*releaseInstrumentPanelLayers\(parts\)/);
});

test("saved private-channel switches determine the attachment collision footprint", () => {
  const profile = app.match(/function currentEntityConstellationCardProfile\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(profile, /thoughtAttachmentEnabled = graphicsSettings\.entityPanelThoughtVisible !== false/);
  assert.match(profile, /forecastAttachmentEnabled = graphicsSettings\.entityPanelForecastVisible !== false/);
  assert.match(profile, /thoughtAttachmentEnabled,/);
  assert.match(profile, /forecastAttachmentEnabled/);
});

test("integrated instrument geometry is immutable and independent of changing runtime content", () => {
  const baseline = entityConstellationCardProfile();
  const changingRuntimeContent = entityConstellationCardProfile({
    thoughtVisible: false,
    predictionVisible: false,
    currentHealth: 7,
    immediateConcern: "different concern",
    pregnancyProgress: .91
  });
  assert.equal(baseline.instrument.detailLevel, "instrument");
  assert.deepEqual(changingRuntimeContent.instrument.screenSize, baseline.instrument.screenSize);
  assert.deepEqual(changingRuntimeContent.instrument.panel, baseline.instrument.panel);
  assert.deepEqual(changingRuntimeContent.instrument.slots, baseline.instrument.slots);
  assert.ok(Object.isFrozen(baseline.instrument));
  assert.ok(Object.isFrozen(baseline.instrument.slots));
});

test("instrument sections remain independently configurable through deliberate settings", () => {
  const complete = entityConstellationCardProfile().instrument;
  const noHealth = entityConstellationCardProfile({ healthVisible: false }).instrument;
  const noMetabolic = entityConstellationCardProfile({ metabolicVisible: false }).instrument;
  const noPerformance = entityConstellationCardProfile({ performanceVisible: false }).instrument;
  assert.ok(complete.healthBand && complete.metabolic && complete.performance);
  assert.equal(noHealth.healthBand, null);
  assert.equal(noHealth.slots.health, null);
  assert.equal(noMetabolic.metabolic, null);
  assert.equal(noMetabolic.slots.metabolic, null);
  assert.ok(noMetabolic.performance);
  assert.equal(noPerformance.performance, null);
  assert.equal(noPerformance.slots.performance, null);
  assert.ok(noPerformance.metabolic);
  assert.ok(noHealth.screenSize.height < complete.screenSize.height);
});

test("selected private clouds occupy instrument-owned attachment slots above the fixed panel", () => {
  const instrument = entityConstellationCardProfile().instrument;
  assert.ok(instrument.thought.y < instrument.panel.top);
  assert.ok(instrument.prediction.y < instrument.panel.top);
  assert.deepEqual(instrument.slots.thought, { x: instrument.thought.x, y: instrument.thought.y });
  assert.deepEqual(instrument.slots.prediction, { x: instrument.prediction.x, y: instrument.prediction.y });
  assert.equal(instrument.attachmentTargets.thought.y, instrument.panel.top);
  assert.equal(instrument.attachmentTargets.prediction.y, instrument.panel.top);
  assert.ok(instrument.selectedFootprint.top < instrument.panel.top);
});

test("selected bubbles always use the animal-head origin", () => {
  assert.doesNotMatch(app, /id="graphics-entity-bubble-origin"/);
  assert.doesNotMatch(app, /Panel top edge/);
  assert.doesNotMatch(app, /Bubble origin/);
  assert.match(app, /function selectedBubbleSlots\(layout, panelProfile, panelScale, projection\)/);
  assert.doesNotMatch(app, /graphicsSettings\.entityBubbleOrigin !== "head"/);
  assert.match(app, /headPart\.getWorldPosition\(constellationScratch\.headAnchor\)/);
  assert.match(app, /const headX = Number\.isFinite\(projection\?\.headScreenX\) \? projection\.headScreenX : layout\.body\.x/);
  assert.match(app, /const headTopY = headY - Math\.max\(3, Number\(projection\?\.projectedHeadPx\)/);
  assert.match(app, /const bubbleSlots = selectedBubbleSlots\(layout, panelProfile, panelScale, projection\)/);
  assert.match(app, /setConstellationSlot\(parts\.thought, bubbleSlots\.thought/);
  assert.match(app, /setConstellationSlot\(parts\.predictionThought, bubbleSlots\.prediction/);
  assert.doesNotMatch(app, /clone\(parts\.(?:thought|predictionThought)\)/);
});

test("canonical selected clouds fill two proportional near-half-width panel bays", () => {
  const instrument = entityConstellationCardProfile({
    thoughtScale: 1,
    predictionScale: 1,
    physiologyTextScale: 1.15
  }).instrument;
  const gap = instrument.prediction.x - instrument.prediction.width / 2
    - (instrument.thought.x + instrument.thought.width / 2);
  assert.ok(instrument.thought.width > instrument.panel.width * .43);
  assert.ok(instrument.prediction.width > instrument.panel.width * .43);
  assert.ok(instrument.thought.width < instrument.panel.width / 2);
  assert.ok(instrument.prediction.width < instrument.panel.width / 2);
  assert.ok(Math.abs(instrument.thought.width / instrument.thought.height - 116 / 91) < 1e-6);
  assert.ok(Math.abs(instrument.prediction.width / instrument.prediction.height - 116 / 91) < 1e-6);
  assert.ok(gap > 0);
  assert.ok(instrument.attachmentBounds.width <= instrument.panel.width);
});

test("one canonical card profile drives geometry while panel and text scales remain independent", () => {
  const profile = app.match(/function currentEntityConstellationCardProfile\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const applier = app.match(/function applyEntityConstellationLayout\(rendered, a, state\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(profile, /expressionScale: 1,/);
  assert.match(profile, /publicCueScale: 1,/);
  assert.match(profile, /thoughtScale: graphicsSettings\.entityBubbleScale,/);
  assert.match(profile, /predictionScale: graphicsSettings\.entityBubbleScale,/);
  assert.match(profile, /physiologyTextScale: 1\.15/);
  assert.doesNotMatch(profile, /entityPanelTextScale/);
  for (const legacySetting of ["graphicsSettings.entityIdentityScale", "graphicsSettings.entityExpressionScale", "graphicsSettings.entityIconScale", "graphicsSettings.thoughtScale", "graphicsSettings.predictionScale", "graphicsSettings.diagnosticScale", "graphicsSettings.diagnosticTextScale"]) assert.doesNotMatch(profile, new RegExp(legacySetting.replaceAll(".", "\\.")), legacySetting);
  assert.match(profile, /public: value\.panel, selected: value\.instrument/);
  assert.doesNotMatch(profile, /enabledBandsNeedInstrumentSurface/);
  assert.match(applier, /panelProfile = integratedInstrument \? cardProfile\.selected : cardProfile\.public/);
  assert.match(applier, /uniformPanelScale = integratedInstrument \? graphicsSettings\.entitySelectedPanelScale : graphicsSettings\.entityPublicPanelScale/);
  assert.match(applier, /panelScale = layout\.panelDimensions\?\.width > 0 \? layout\.panelDimensions\.width \/ panelProfile\.screenSize\.width : requestedPanelScale/);
  assert.match(app, /const sideCells = panelProfile\.sideCells/);
  assert.match(app, /parts\.face\.scale\.set\(sideCells\.expression\.width/);
  assert.match(app, /parts\.signal\.scale\.set\(sideCells\.outward\.width/);
  assert.match(app, /parts\.actionBadge\.scale\.set\(sideCells\.action\.width/);
  assert.match(app, /panelProfile\.thought\.width \* panelScale/);
  assert.match(app, /panelProfile\.prediction\.width \* panelScale/);
  assert.match(app, /projection\.layoutProfile = constellationResolverProfile\(projection\.instrumentOwner \? cardProfile\.selected : cardProfile\.public, panelSettingScale\(projection\.instrumentOwner\)\)/);
  assert.match(app, /panelWidthPx: profile\.screenSize\.width \* scale/);
  assert.match(app, /const identityScale = graphicsSettings\.entityPanelTextScale \|\| 1/);
  assert.match(app, /profile\.settings\.physiologyTextScale \* panelTextScale/);
  assert.match(app, /`text:\$\{panelTextScale\}`/);
});

test("wheel-sampled camera-to-owner distance continuously scales the one stable panel", () => {
  assert.match(app, /resolveEntityPanelScaleSnapshot/);
  assert.match(app, /let entityPanelScaleWheelRevision = 0/);
  assert.match(app, /if \(!Number\(event\.deltaY\) \|\| !controls\.enabled \|\| !controls\.enableZoom \|\| movieState\.active \|\| currentEmbodiment\(\)\.experience === "embodied"\) return/);
  assert.match(app, /const distanceBeforeDolly = controls\.getDistance\(\)/);
  assert.match(app, /window\.setTimeout\(\(\) => \{\s*if \(Math\.abs\(controls\.getDistance\(\) - distanceBeforeDolly\) <= 1e-4\) return;\s*entityPanelScaleWheelRevision \+= 1;[\s\S]*?\}, 0\)/);
  assert.doesNotMatch(app, /queueMicrotask\(\(\) => \{[\s\S]*?entityPanelScaleWheelRevision/);
  assert.match(app, /\}, \{ capture: true, passive: true \}\)/);
  assert.doesNotMatch(app, /if \(Number\(event\.deltaY\)\) entityPanelScaleWheelRevision \+= 1/);
  assert.match(app, /resolveEntityPanelScaleSnapshot\(\{ distance: projection\.livePanelDistance, wheelRevision: entityPanelScaleWheelRevision, previous: entityPanelScaleSnapshots\.get\(projection\.id\) \}\)/);
  assert.match(app, /projection\.panelScale = panelScaleSnapshot\.scale/);
  assert.match(app, /wheelPanelScale = layout\.panelScale \|\| 1/);
  assert.match(app, /requestedPanelScale = wheelPanelScale \* uniformPanelScale/);
  assert.match(app, /publicPanel\.visible = identityAllowed/);
  assert.match(app, /instrumentBackdrop\.visible = identityAllowed/);
  assert.match(app, /panelScreenSize = layout\.panelDimensions \? \{ width: layout\.panelDimensions\.width, height: layout\.panelDimensions\.height \}/);
  assert.match(app, /panel\.userData\.wheelPanelScale = wheelPanelScale/);
  assert.match(app, /panel\.userData\.uniformPanelScale = uniformPanelScale/);
});

test("focus affects the complete constellation without mutating shared symbol materials", () => {
  assert.match(app, /ownershipTetherRibbon/);
  assert.match(app, /layout\.tetherWidth > 1\.25/);
  assert.match(app, /applyConstellationSemanticOpacity\(parts, layout\.opacity \?\? 1\)/);
  assert.match(app, /setEntityOwnedSpriteMaterial\(parts\.face/);
  assert.match(app, /setEntityOwnedSpriteMaterial\(parts\.signal/);
  assert.match(app, /setEntityOwnedSpriteMaterial\(actionBadge/);
});

test("labels and symbols are first-class hover and selection targets", () => {
  assert.match(app, /function entityOwnershipPickTargets\(\)/);
  assert.match(app, /!rendered\.userData\.constellationLayout \|\| !rendered\.userData\.parts\?\.constellationRoot\?\.visible/);
  for (const target of ["parts.identityPanel", "parts.face", "parts.signal", "parts.actionBadge", "parts.thought", "parts.predictionThought"]) assert.ok(app.includes(target), target);
  assert.match(app, /candidate\.object\.userData\.ownerEntityId/);
});

test("only front-viewport owners receive cards and rejected owners clear the one stale surface", () => {
  assert.match(app, /const bodyClipZ = constellationScratch\.projected\.z/);
  assert.match(app, /clipZ: bodyClipZ/);
  assert.match(app, /viewDepth/);
  assert.match(app, /const panelVisible = projection\.instrumentOwner \? selectedPresentationVisible : publicPanelsVisible/);
  assert.match(app, /const independentLayerVisible = projection\.visibleChannels\.some/);
  assert.match(app, /const surfaceVisible = panelVisible \|\| independentLayerVisible/);
  assert.match(app, /if \(!surfaceVisible\) \{[\s\S]*?hideEntityConstellation\(rendered\);[\s\S]*?return null;/);
  assert.match(app, /\.filter\(\(projection\) => projection && projectedEntityIntersectsViewport\(projection, canvasViewport\)\)/);
  assert.match(app, /function hideEntityConstellation\(rendered\)/);
  for (const surface of ["parts.constellationRoot", "parts.ownershipTether", "parts.ownershipTetherRibbon", "parts.ownershipEndpoint"]) assert.match(app, new RegExp(surface.replaceAll(".", "\\.")));
  assert.match(app, /parts\.identityPanel/);
  assert.match(app, /if \(!layout\) \{ hideEntityConstellation\(rendered\); return; \}/);
});

test("organism admission follows the live camera frustum rather than a target-centred ground radius", () => {
  assert.match(app, /camera\.updateMatrixWorld\(\)/);
  assert.match(app, /corpseFrustum\.setFromProjectionMatrix\(corpseFrustumMatrix\.multiplyMatrices\(camera\.projectionMatrix, camera\.matrixWorldInverse\)\)/);
  assert.match(app, /const animalIntersectsCameraView = \(animal\) => \{/);
  assert.match(app, /return corpseFrustum\.intersectsSphere\(animalCullSphere\)/);
  assert.match(app, /const displayAnimals = sim\.animals\.filter\([^\n]*animalIntersectsCameraView\(x\)/);
  assert.doesNotMatch(app, /const drawRadius\s*=/);
  assert.doesNotMatch(app, /Math\.hypot\(x\.x - controls\.target\.x, x\.z - controls\.target\.z\) <= drawRadius/);
});

test("camera-driven panel refresh runs after controls and outside the completed-tick deferral gate", () => {
  const loopStart = app.indexOf("function loop(now) {");
  const loopEnd = app.indexOf("\nfunction selectedWorldSetup", loopStart);
  const loop = app.slice(loopStart, loopEnd);
  const tickGate = loop.indexOf("if (!completedTicksLastFrame)");
  const controlsUpdate = loop.indexOf("if (controls.enabled) controls.update()");
  const visibilityRefresh = loop.indexOf("if (entityPanelVisibilityRefreshPending");
  const cameraRefresh = loop.indexOf('profiler.measure("frame presentation update", () => syncAnimalVisuals(now))');
  assert.ok(loopStart >= 0 && loopEnd > loopStart, "animation loop must be extractable");
  assert.ok(tickGate >= 0, "simulation-tick DOM deferral gate must remain explicit");
  assert.ok(controlsUpdate > tickGate, "camera controls must update after tick scheduling");
  assert.ok(visibilityRefresh > controlsUpdate, "a pending camera refresh must run after controls accept the camera pose");
  assert.ok(cameraRefresh > visibilityRefresh, "newly admitted roots must receive their constellation layout before the same frame renders");
  assert.ok(cameraRefresh > controlsUpdate, "entity projection must refresh after OrbitControls accepts camera changes");
  assert.doesNotMatch(loop.slice(tickGate, controlsUpdate), /syncAnimalVisuals\(now\)/);
});

test("on-screen cards use a centre-weighted strict budget and suppressed owners clear through missing layouts", () => {
  assert.match(app, /selectEntityConstellationBudget\(onScreenProjected/);
  assert.match(app, /const budgetOptions = \{ viewportBounds: canvasViewport, previousVisibleIds: previousOwnership \}/);
  assert.match(app, /if \(panelFocus\.exclusive\) budgetOptions\.exclusiveFocusId = panelFocus\.ownerId/);
  assert.match(app, /selectEntityConstellationBudget\(onScreenProjected, budgetOptions\)/);
  assert.match(app, /suppressOverlappingEntityConstellations\(records, \{ viewportBounds: canvasViewport/);
  assert.match(app, /resolveEntityConstellations\(projected, \{[^\n]*viewportBounds: placementViewport/);
  assert.match(app, /previousVisibleIds: previousOwnership/);
  assert.match(app, /onScreenProjected\.filter\(\(projection\) => admittedIds\.has\(String\(projection\.id\)\)\)/);
  assert.match(app, /suppressOverlappingEntityConstellations\(records/);
  assert.match(app, /records\.filter\(\(record\) => finalVisibleIds\.has\(record\.entityId\)\)/);
  assert.match(app, /overlapSuppressedCount:/);
  assert.match(app, /blockingEntityId:/);
  assert.match(app, /panelAdmitted: Boolean\(decision\?\.admitted\)/);
  assert.match(app, /suppressionReason:/);
  assert.match(app, /entityConstellationBudgetState:/);
});

test("ordinary thought and predictive forecast are separate permitted private sprites", () => {
  const start = app.indexOf("function updateEntityIndicators("), end = app.indexOf("\nfunction ", start + 10), indicators = app.slice(start, end);
  assert.ok(start >= 0 && end > start, "entity-indicator renderer is extractable");
  assert.match(app, /rendered\.userData\.predictionThoughtBubble/);
  assert.match(app, /rendered\.userData\.parts\.predictionThought = predictionThought/);
  assert.match(app, /thought\.userData\.predictionInsight = false/);
  assert.match(app, /predictionThought\.userData\.predictionInsight = true/);
  assert.match(app, /thought\.visible = Boolean\(privateCloudsAllowed && thoughtRule\.visible && heldThought\)/);
  assert.match(app, /predictionThought\.visible = Boolean\(privateCloudsAllowed && showPredictionInsight && displayedPredictionCue\)/);
  assert.doesNotMatch(indicators, /a\.id === selectedId[^;]*permittedChannels\.includes\("thought"\)/);
  assert.match(app, /const cognitionBubbleOwner = !embodiedSelf && \(!movieState\.active \|\| movieFeaturedAnimal\(a, true\)\)/);
  assert.match(app, /const privateCognitionVisible = cognitionChannelPermitted[^;]*graphicsSettings\.entityPanelThoughtVisible !== false/);
  assert.match(app, /\.\.\.\(privateCognitionVisible \? \["thought"\] : \[\]\)/);
  assert.match(app, /\.\.\.\(predictionAvailable \? \["prediction"\] : \[\]\)/);
  assert.match(app, /const privateCognitionPermitted = cognitionBubbleOwner/);
  assert.doesNotMatch(app, /const privateCognitionPermitted = cognitionBubbleOwner && state\.permittedChannels\.includes\("thought"\)/);
  assert.match(app, /if \(!thought && heldThought\)/);
  assert.match(app, /if \(!predictionThought && displayedPredictionCue\)/);
  assert.match(app, /presentationChannelHolds\.resolve\(\{ entityId: a\.id, channel: "thought"/);
  assert.match(app, /presentationChannelHolds\.resolve\(\{ entityId: a\.id, channel: "forecast"/);
  assert.match(app, /emptyPredictionInsightCue\(a\.predictiveCycle, predictionCue \? "no-new-insight" : null\)/);
  assert.match(app, /empty: !predictionWindowActive/);
  assert.match(app, /undecidedThoughtPresentation\(a\)/);
  assert.match(app, /const privateCloudsAllowed = privateCognitionPermitted && showEntitySymbols/);
  assert.doesNotMatch(app, /const privateCloudsAllowed = privateWorldOwner/);
  assert.doesNotMatch(app, /movieFeaturedAnimal\(a, true\) && movieChannelEnabled\("thoughts"\)/);
  assert.doesNotMatch(app, /showPredictionInsight \? predictionInsightMaterial\(a, predictionCue\) : thoughtBubbleMaterial/);
});

test("the left ordinary cloud points back to the panel without mirroring its semantic content", () => {
  const ordinaryFactory = app.match(/function thoughtBubbleMaterial\(a, priority, alignmentTone = "private"\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const canvasFactory = app.match(/function thoughtBubbleCanvasFromPresentation\([\s\S]*?\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(ordinaryFactory, /tailSide = "right"/);
  assert.match(canvasFactory, /tailLargeX = resolvedTailSide === "right" \? 204 : 52/);
  assert.match(canvasFactory, /tailSmallX = resolvedTailSide === "right" \? 229 : 27/);
  assert.doesNotMatch(canvasFactory, /scale\s*\(\s*-1|transform\s*\([^)]*-1/);
  const forecastFactory = app.match(/function predictionInsightCanvas\(visualCue,[\s\S]*?\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(forecastFactory, /drawTail\(55, 166, 11\); drawTail\(31, 188, 5\)/);
});

test("presentation tiers cannot suppress constellation-attached semantic UI", () => {
  const tierApplier = app.match(/function applyPresentationTier\(group, tier, channels\) \{([\s\S]*?)\n\}\nfunction drawAnimal/)?.[1] || "";
  assert.match(tierApplier, /presentationPartVisibility\(tier\)/);
  for (const part of ["face", "actionBadge", "signal", "thought", "predictionThought"]) {
    assert.doesNotMatch(tierApplier, new RegExp(`parts\\.${part}\\b`), `${part} must remain governed by its semantic and privacy rules, not camera presentation tier`);
  }
  const projector = app.match(/function projectConstellationEntry\(rendered, a, state, channels\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(projector, /graphicsSettings\.entityPanelIdentityVisible/);
  assert.match(projector, /graphicsSettings\.entityPanelPublicCueVisible/);
  assert.match(projector, /graphicsSettings\.entityPanelExpressionVisible/);
  assert.match(projector, /"urgent"\]/);
  assert.doesNotMatch(projector, /tier\s*[!=]==?\s*["'](?:close|selected)["']/);
});

test("the integrated instrument suppresses the three independently positioned physiology overlays", () => {
  const updaterStart = app.indexOf("function updateEntityIndicators(");
  const updaterEnd = app.indexOf("\nfunction ", updaterStart + 1);
  const updater = updaterStart >= 0 ? app.slice(updaterStart, updaterEnd > updaterStart ? updaterEnd : undefined) : "";
  assert.match(updater, /const integratedInstrument = entityConstellationLayouts\.get\(a\.id\)\?\.detailLevel === "instrument"/);
  assert.match(updater, /const showHealth = !integratedInstrument/);
  assert.match(updater, /const showEndurance = !integratedInstrument/);
  assert.match(updater, /const showComposition = !integratedInstrument/);
  assert.match(updater, /healthBar\.visible = showHealth/);
  assert.match(updater, /enduranceBar\.visible = showEndurance/);
  assert.match(updater, /compositionBar\.visible = showComposition/);
  assert.match(updater, /physiologyRoot\.visible = showHealth \|\| showEndurance \|\| showComposition/);
  assert.match(updater, /instrumentSectionVisibility = \{ health: instrumentHealth, performance: instrumentPerformance, metabolic: instrumentMetabolic \}/);
});

test("the public rail and selected instrument are mutually exclusive surfaces", () => {
  const applier = app.match(/function applyEntityConstellationLayout\(rendered, a, state\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(applier, /const integratedInstrument = layout\.detailLevel === "instrument"/);
  assert.match(applier, /publicPanel\.visible = false/);
  assert.match(applier, /instrumentBackdrop\.visible = identityAllowed/);
  assert.match(applier, /instrumentMetrics\.visible = identityAllowed/);
  assert.match(applier, /publicPanel\.visible = identityAllowed/);
  assert.match(applier, /instrumentBackdrop\.visible = instrumentMetrics\.visible = false/);
});

test("settings expose independently switchable animal-attached layers without design or information presets", () => {
  for (const id of ["graphics-entity-public-panels-visible", "graphics-entity-public-panel", "graphics-entity-selected-panel", "graphics-entity-panel-text", "graphics-entity-bubble-scale"]) assert.ok(app.includes(id), id);
  assert.doesNotMatch(app, /id="graphics-entity-selected-presentation-visible"/);
  for (const removedId of ["graphics-entity-panel-style", "graphics-entity-panel-preset"]) assert.ok(!app.includes(removedId), removedId);
  for (const obsoleteId of ["graphics-entity-expression", "graphics-entity-identity", "graphics-prediction-size", "graphics-entity-icons", "graphics-thought-size", "graphics-diagnostic-size", "graphics-diagnostic-text"]) assert.ok(!app.includes(obsoleteId), obsoleteId);
  assert.match(app, /Ordinary constellation size · all layers/);
  assert.match(app, /Selected constellation size · all layers/);
  assert.match(app, /Identity marking and numerical text size/);
  assert.match(app, /ui\.graphicsEntityPanelText\.value = String\(graphicsSettings\.entityPanelTextScale\)/);
  assert.match(app, /entityPanelTextScale: Number\(ui\.graphicsEntityPanelText\.value\)/);
  assert.match(app, /panelTextSettingScale: graphicsSettings\.entityPanelTextScale/);
  assert.match(app, /Show optional identity and status frame/i);
  assert.doesNotMatch(app, /Show selected main panel and bubbles/i);
  assert.match(app, /Configure every layer in the visual constellation around an animal/i);
  assert.match(app, /Body identity and pregnancy marking/i);
  for (const module of ["identity", "expression", "public-cue", "health", "thought", "forecast"]) assert.ok(app.includes(`["${module}",`), module);
  for (const typographyId of ["font-small-scale", "font-body-scale", "font-control-scale", "font-heading-scale", "font-title-scale"]) assert.ok(app.includes(typographyId), typographyId);
  assert.match(app, /Typography categories/);
});

test("constellation settings remain editable while optional presentation layers are hidden", () => {
  const sync = app.match(/function syncGraphicsControls\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(sync, /graphicsEntityPublicPanel\.disabled = false/);
  assert.match(sync, /graphicsEntitySelectedPanel\.disabled = false/);
  assert.match(sync, /graphicsEntityPanelText\.disabled = false/);
  assert.match(sync, /Object\.values\(ui\.graphicsEntityPanelModules \|\| \{\}\)/);
  assert.match(sync, /graphicsEntityBubbleScale\.disabled = false/);
  assert.doesNotMatch(sync, /graphicsEntityPublicPanel\.disabled = publicPanelsHidden/);
  assert.doesNotMatch(sync, /graphicsEntitySelectedPanel\.disabled = selectedPresentationHidden/);
});

test("animal-attached presentation places each visual channel around the physical animal", () => {
  const start = app.indexOf("function applyAnimalAttachedHudLayout");
  const end = app.indexOf("function applyEntityConstellationLayout", start);
  const applier = start >= 0 && end > start ? app.slice(start, end) : "";
  assert.match(applier, /headX - headRadius - faceSize/);
  assert.match(applier, /headX \+ headRadius \+ cueWidth/);
  assert.match(applier, /bodyIdentityMarking/);
  assert.match(applier, /updateAnimalBodyMarking/);
  assert.match(applier, /groundHealthBar/);
  assert.match(applier, /updateAnimalGroundHealth/);
  assert.match(applier, /headY - headRadius - bubble\.height/);
  assert.match(applier, /entityPanelIdentityVisible !== false/);
  assert.match(applier, /entityPanelExpressionVisible !== false/);
  assert.match(applier, /entityPanelPublicCueVisible === false/);
  assert.match(applier, /entityPanelHealthVisible !== false/);
});

test("ownership shape reaches endpoints and attached symbol notches", () => {
  assert.match(app, /ownershipShapeTexture\(layout\.tether\.endpointShape\)/);
  assert.match(app, /ownershipNotches/);
  assert.match(app, /ownershipShapeTexture\(layout\.style\.shape\)/);
});

test("ownership notches cannot survive without their panel and rendered semantic icon", () => {
  const applier = app.match(/function applyEntityConstellationLayout\(rendered, a, state\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const clear = applier.indexOf("for (const notch of Object.values(parts.ownershipNotches || {})) notch.visible = false");
  const specs = applier.indexOf("const notchSpecs = {");
  assert.ok(clear >= 0 && specs > clear, "stale notch visibility must clear before current semantic resolution");
  assert.match(applier, /semanticTexture = spec\?\.part\?\.material\?\.map \|\| spec\?\.part\?\.material\?\.alphaMap/);
  assert.match(applier, /externalAttachment = channel === "thought" \|\| channel === "prediction"/);
  assert.match(applier, /notch\.visible = Boolean\(externalAttachment && panel\.visible && showEntitySymbols && spec\?\.channelVisible && spec\.part\?\.visible && semanticTexture && semanticOpacity > \.02\)/);
  assert.match(applier, /tether\.visible = endpoint\.visible = identityAllowed/);
});

test("relation and receipt links follow presentation positions", () => {
  assert.match(app, /constellationWorldPoint\(actorLayout, actorRendered, relation\.start/);
  assert.match(app, /constellationWorldPoint\(targetLayout, targetRendered, relation\.end/);
  assert.match(app, /const visualById = new Map\(visibleEntries\.map/);
  assert.match(app, /receiverVisual = visualById\.get\(receiver\.id\) \|\| receiver/);
});

test("diagnostics expose admission, wheel scale and the one bounded panel surface", () => {
  const diagnostics = app.match(/entityConstellationState: \(\) => ([\s\S]*?)\n  entityConstellationBudgetState:/)?.[1] || "";
  assert.match(diagnostics, /detailLevel: layout\.detailLevel/);
  assert.match(diagnostics, /placement: layout\.placement/);
  assert.match(diagnostics, /panelAdmitted:/);
  assert.match(diagnostics, /panelScale:/);
  assert.match(diagnostics, /panelSettingScale:/);
  assert.match(diagnostics, /panelDimensions:/);
  assert.match(diagnostics, /footprint:/);
  assert.match(diagnostics, /collisionBounds:/);
  assert.match(diagnostics, /effectivePanelScale:/);
  assert.match(diagnostics, /panelDistance:/);
  assert.match(diagnostics, /panelScaleRevision:/);
  assert.match(diagnostics, /body: \{ \.\.\.layout\.body \}/);
  assert.match(diagnostics, /panelTexture:/);
  assert.match(diagnostics, /panelScreenSize:/);
  assert.match(diagnostics, /panelCenter:/);
  assert.match(diagnostics, /panelVisible:/);
  assert.match(diagnostics, /instrumentVisible:/);
  assert.match(diagnostics, /instrumentMetricsVisible:/);
  assert.match(diagnostics, /integratedPhysiology:/);
  assert.doesNotMatch(diagnostics, /summaryMast|compactMast|cardVisible/);
});
