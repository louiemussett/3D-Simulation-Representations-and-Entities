import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const root = process.cwd(), port = 4173;
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname), relative = pathname === "/" ? "index.html" : pathname.slice(1), file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error("outside root");
    const { stat } = await import("node:fs/promises"), info = await stat(file); if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end("Not found"); }
});

const waitFor = async (work, description, timeout = 20_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await work()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out waiting for ${description}`);
};
const checkpoint = (label) => process.stdout.write(`Browser smoke: ${label}\n`);
const projectedBodyIntersectsViewport = (item, viewport) => {
  const radius = Math.max(2, Number(item?.projectedBodyPx || 0) * .5);
  return Number.isFinite(item?.body?.x) && Number.isFinite(item?.body?.y)
    && item.body.x + radius >= 0 && item.body.x - radius <= viewport.width
    && item.body.y + radius >= 0 && item.body.y - radius <= viewport.height;
};
const constellationPanelRect = (item) => {
  const size = item?.render?.panelScreenSize;
  const centre = item?.render?.panelCenter;
  if (!size || !centre) return null;
  const x = item.anchor.x + centre.x, y = item.anchor.y + centre.y;
  return { left: x - size.width / 2, right: x + size.width / 2, top: y - size.height / 2, bottom: y + size.height / 2 };
};
const assertIntegratedPanelContract = (items, viewport, label) => {
  if (!items.length) throw new Error(`${label} produced no admitted ownership panels`);
  if (items.some((item) => !["panel", "instrument"].includes(item.detailLevel) || item.panelAdmitted !== true || item.render?.panelVisible !== true)) throw new Error(`${label} did not use an admitted public rail or integrated selected-animal instrument surface`);
  const instruments = items.filter((item) => item.detailLevel === "instrument");
  if (instruments.length > 1 || instruments.some((item) => !(item.selected || item.cinemaInstrumentOwner) || item.render?.instrumentVisible !== true)) throw new Error(`${label} did not reserve the integrated instrument for the observer- or Cinema-focused animal`);
  if (instruments.length === 1 && items.length !== 1) throw new Error(`${label} retained ${items.length - 1} other entity panels beside the exclusive instrument`);
  if (items.some((item) => item.selected && item.detailLevel !== "instrument")) throw new Error(`${label} left the selected animal on the unselected public rail`);
  if (items.some((item) => item.detailLevel === "panel" && (item.render?.instrumentVisible || item.render?.instrumentMetricsVisible))) throw new Error(`${label} leaked selected-only instrument layers onto an unselected rail`);
  if (items.some((item) => !Number.isFinite(item.panelScale) || item.panelScale < .42 || item.panelScale > 1.25 || !Number.isFinite(item.panelDistance) || item.panelDistance < 0 || !Number.isInteger(item.panelScaleRevision) || item.panelScaleRevision < 0)) throw new Error(`${label} did not report a valid bounded continuous wheel scale`);
  if (items.some((item) => !Number.isFinite(item.panelSettingScale) || item.panelSettingScale < .6 || item.panelSettingScale > 1.5 || !item.panelDimensions || Math.abs(item.render?.panelScreenSize?.width - item.panelDimensions.width) > 1e-6 || Math.abs(item.render?.panelScreenSize?.height - item.panelDimensions.height) > 1e-6 || Math.abs(item.render?.uniformPanelScale - item.panelSettingScale) > 1e-6 || Math.abs(item.render?.wheelPanelScale - item.panelScale) > 1e-6 || Math.abs(item.render?.effectivePanelScale - item.panelScale * item.panelSettingScale) > 1e-6)) throw new Error(`${label} let rendered panel size diverge from its uniformly scaled collision geometry`);
  if (items.some((item) => !item.collisionBounds || ![item.collisionBounds.left, item.collisionBounds.right, item.collisionBounds.top, item.collisionBounds.bottom].every(Number.isFinite))) throw new Error(`${label} did not expose complete visual collision bounds`);
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
    const left = items[leftIndex].collisionBounds, right = items[rightIndex].collisionBounds;
    const overlaps = left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
    if (overlaps) throw new Error(`${label} admitted overlapping entity panels ${items[leftIndex].entityId} and ${items[rightIndex].entityId}`);
  }
  if (items.some((item) => !projectedBodyIntersectsViewport(item, viewport))) throw new Error(`${label} admitted a panel whose animal was outside the viewport`);
  const invalidTextures = items.filter((item) => {
    const texture = item.render?.panelTexture, size = item.render?.panelScreenSize;
    if (!texture || !size || !Number.isFinite(size.width) || !Number.isFinite(size.height) || ![1, 2].includes(texture.quality) || !Number.isInteger(texture.logicalWidth) || !Number.isInteger(texture.logicalHeight)) return true;
    if (texture.width !== Math.ceil(texture.logicalWidth * texture.quality) || texture.height !== Math.ceil(texture.logicalHeight * texture.quality)) return true;
    if (item.detailLevel === "panel") return texture.logicalWidth !== 628 || texture.logicalHeight !== 164 || texture.quality !== 1;
    return texture.logicalWidth < 384 || texture.logicalWidth > 1024 || texture.logicalHeight < 176 || texture.logicalHeight > 1024;
  });
  if (invalidTextures.length) throw new Error(`${label} ownership surfaces exceeded their fixed per-profile texture budget: ${JSON.stringify(invalidTextures.map((item) => ({ entityId: item.entityId, detailLevel: item.detailLevel, texture: item.render?.panelTexture, screenSize: item.render?.panelScreenSize })))}`);
  if (instruments.some((item) => {
    const physiology = item.render?.integratedPhysiology;
    return !physiology || physiology.standaloneHealthVisible || physiology.standalonePerformanceVisible || physiology.standaloneMetabolicVisible;
  })) throw new Error(`${label} rendered a legacy physiology window beside the integrated instrument`);
  if (items.some((item) => { const rect = constellationPanelRect(item); return !rect || rect.left < -1 || rect.right > viewport.width + 1 || rect.top < -1 || rect.bottom > viewport.height + 1; })) throw new Error(`${label} ownership UI escaped the visible viewport`);
  if (items.some((item) => !item.selected && (item.render.ordinaryThoughtVisible || item.render.predictionVisible))) throw new Error(`${label} exposed private cognition for an unselected owner`);
};

let browserServer, browser, context, page;
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  checkpoint("server ready");
  // Playwright's standalone chrome-headless-shell has proved unstable on some
  // Windows graphics stacks. Prefer the installed Chrome binary when it is
  // available, matching the main Playwright configuration, and retain the
  // bundled browser as the portable fallback.
  const installedChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const executablePath = process.env.PLAYWRIGHT_CHROME_PATH
    || (existsSync(installedChrome) ? installedChrome : undefined);
  browserServer = await chromium.launchServer({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  checkpoint(`browser launched via ${executablePath ? "installed Chrome" : "bundled Chromium"}`);
  browser = await chromium.connect(browserServer.wsEndpoint());
  context = await browser.newContext({ viewport: { width: 960, height: 640 } });
  page = await context.newPage();
  checkpoint("page created");
  const errors = []; page.on("pageerror", (error) => errors.push(error.stack || error.message));
  await page.goto(`http://127.0.0.1:${port}/?test=1&profile=1`);
  checkpoint("page loaded");
  await waitFor(() => page.evaluate(() => typeof window.rssDiagnostics === "object"), "diagnostics startup");
  checkpoint("diagnostics ready");
  await waitFor(() => page.locator("#viewport canvas").isVisible(), "visible simulation canvas");
  await waitFor(() => page.evaluate(() => window.rssDiagnostics.report().resources["renderer.info.render.calls"] > 0), "first Three.js render");
  checkpoint("first Three.js render");
  const defaults = await page.evaluate(() => ({ span: document.querySelector("#world-size").value, herbivores: document.querySelector("#start-herbivores").value, carnivores: document.querySelector("#start-carnivores").value, speed: document.querySelector("#speed").value, speedMaximum: document.querySelector("#speed").max, timeSkip: document.querySelector("#time-skip-period").value }));
  checkpoint("startup defaults read");
  if (JSON.stringify(defaults) !== JSON.stringify({ span: "1", herbivores: "34", carnivores: "11", speed: "1", speedMaximum: "60", timeSkip: "1" })) throw new Error(`Unexpected startup defaults: ${JSON.stringify(defaults)}`);
  const tickBeforeSkip = await page.evaluate(() => window.rssDiagnostics.tick());
  checkpoint("authoritative tick read");
  await page.evaluate(() => document.querySelector("#time-skip").click());
  checkpoint("time skip clicked");
  await waitFor(() => page.evaluate((tick) => window.rssDiagnostics.tick() === tick + 1 && document.querySelector("#time-skip").textContent === "Skip", tickBeforeSkip), "deterministic one-minute time skip");
  checkpoint("time skip completed");
  const followBaseline = await page.evaluate(() => window.rssDiagnostics.prepareBaseline("follow"));
  checkpoint("follow baseline prepared");
  await waitFor(async () => {
    if (errors.length) throw new Error(`Page error before contact-shadow readiness: ${errors.join(" | ")}`);
    return page.evaluate(() => window.rssDiagnostics.report().resources.visibleContactShadows > 0);
  }, "instanced animal contact shadows");
  checkpoint("contact shadows ready");
  // New worlds deliberately start on the compact classic rail. The remainder
  // of this legacy regression fixture exercises the preserved original full
  // instrument, so select it explicitly instead of treating it as a default.
  await page.evaluate(() => {
    const change = (selector, value) => {
      const control = document.querySelector(selector);
      if (!control) throw new Error(`Missing entity-panel control ${selector}`);
      control.value = value;
      control.dispatchEvent(new Event("change", { bubbles: true }));
    };
    change("#graphics-entity-panel-style", "full-instrument");
    change("#graphics-entity-panel-preset", "full");
    change("#graphics-entity-panel", "1");
  });
  await waitFor(() => page.evaluate(() => window.rssDiagnostics.entityConstellationState().some((item) => item.selected && item.detailLevel === "instrument" && item.render?.instrumentVisible)), "explicit original full-instrument design");
  // Keep the selected owner stable while comparing a presentation-only size
  // setting. Full-footprint overlap suppression may legitimately hide every
  // intersecting public rail, so the browser fixture must not require a lower-
  // priority rail to coexist with the selected instrument.
  await page.evaluate(() => { const control = document.querySelector("#hud-play"); if (control?.textContent === "Pause") control.click(); });
  await waitFor(() => page.locator("#hud-play").evaluate((node) => node.textContent === "Play"), "paused uniform panel-scale fixture");
  await waitFor(() => page.evaluate(() => window.rssDiagnostics.entityConstellationState().some((item) => item.selected)), "selected entity ownership constellation");
  const constellations = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const initialConstellationBudget = await page.evaluate(() => window.rssDiagnostics.entityConstellationBudgetState());
  if (!initialConstellationBudget || constellations.length > initialConstellationBudget.capacity || initialConstellationBudget.capacity < 3 || initialConstellationBudget.capacity > 6) throw new Error("Automatic ownership-panel budget was not enforced");
  const constellationViewport = await page.locator("#viewport canvas").evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
  assertIntegratedPanelContract(constellations, constellationViewport, "Initial ownership layout");
  const initialOwnershipResources = await page.evaluate(() => window.rssDiagnostics.report().resources);
  if (constellations.length !== 1 || constellations[0].entityId !== followBaseline.selectedId || constellations[0].detailLevel !== "instrument" || !constellations[0].selected) throw new Error(`Selected animal did not own the sole expanded panel: ${JSON.stringify({ followBaseline, constellations })}`);
  // The resource counter is sampled on the simulation cadence and can trail a
  // presentation-only style change by one paused frame. The live constellation
  // assertion above is authoritative for the chosen surface; counters still
  // verify that no additional owner UI leaked through.
  if (initialOwnershipResources.visibleEntityPanels !== 1 || initialOwnershipResources.visibleOwnershipTethers !== 1 || initialOwnershipResources.visibleEntityNameplates !== 0) throw new Error(`Selected focus retained stray ownership UI: ${JSON.stringify(initialOwnershipResources)}`);
  if (initialOwnershipResources.visibleOwnershipTethers > constellations.length) throw new Error("A stale off-screen ownership tether remained visible");
  const selectedConstellation = constellations.find((item) => item.selected);
  const selectedCardRect = constellationPanelRect(selectedConstellation);
  if (!selectedCardRect || selectedCardRect.left < -1 || selectedCardRect.right > constellationViewport.width + 1 || selectedCardRect.top < -1 || selectedCardRect.bottom > constellationViewport.height + 1) throw new Error("Selected ownership card escaped the visible viewport");
  if (!selectedConstellation?.render?.thickTetherVisible) throw new Error("Selected constellation did not render its emphasized ownership tether");
  if (selectedConstellation.render.endpointShape !== selectedConstellation.style.shape) throw new Error("Ownership endpoint shape did not match the entity style");
  const settingScaleBaseline = { entityId: selectedConstellation.entityId, detailLevel: selectedConstellation.detailLevel, width: selectedConstellation.render.panelScreenSize.width, height: selectedConstellation.render.panelScreenSize.height, wheelScale: selectedConstellation.panelScale, wheelRevision: selectedConstellation.panelScaleRevision };
  await page.evaluate(() => { const control = document.querySelector("#graphics-entity-panel"); control.value = "1.5"; control.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor(() => page.evaluate((selectedId) => window.rssDiagnostics.entityConstellationState().some((item) => item.entityId === selectedId && item.panelSettingScale === 1.5), selectedConstellation.entityId), "uniform selected-instrument setting scale");
  const settingScaledConstellations = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const settingScaledById = new Map(settingScaledConstellations.map((item) => [item.entityId, item]));
  const settingScaledSelected = settingScaledById.get(settingScaleBaseline.entityId);
  if (!settingScaledSelected || settingScaledSelected.detailLevel !== settingScaleBaseline.detailLevel || Math.abs(settingScaledSelected.render.panelScreenSize.width / settingScaleBaseline.width - 1.5) > 1e-6 || Math.abs(settingScaledSelected.render.panelScreenSize.height / settingScaleBaseline.height - 1.5) > 1e-6 || Math.abs(settingScaledSelected.panelScale - settingScaleBaseline.wheelScale) > 1e-6 || settingScaledSelected.panelScaleRevision !== settingScaleBaseline.wheelRevision) throw new Error(`Entity panel setting did not uniformly scale the selected instrument: ${JSON.stringify({ before: settingScaleBaseline, after: settingScaledSelected })}`);
  assertIntegratedPanelContract(settingScaledConstellations, constellationViewport, "Settings-scaled ownership layout");
  await page.evaluate(() => { const control = document.querySelector("#graphics-entity-panel"); control.value = "1"; control.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor(() => page.evaluate((selectedId) => window.rssDiagnostics.entityConstellationState().some((item) => item.entityId === selectedId && item.panelSettingScale === 1), selectedConstellation.entityId), "uniform entity-panel scale reset");
  const resetScaleState = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const resetSelected = resetScaleState.find((item) => item.entityId === selectedConstellation.entityId);
  if (!resetSelected || Math.abs(resetSelected.render.panelScreenSize.width - selectedConstellation.render.panelScreenSize.width) > 1e-6 || Math.abs(resetSelected.render.panelScreenSize.height - selectedConstellation.render.panelScreenSize.height) > 1e-6 || Math.abs(resetSelected.panelScale - selectedConstellation.panelScale) > 1e-6 || resetSelected.panelScaleRevision !== selectedConstellation.panelScaleRevision) throw new Error(`Uniform entity-panel reset did not restore the selected instrument: ${JSON.stringify({ before: selectedConstellation, after: resetSelected })}`);
  const textScaleBaseline = { entityId: resetSelected.entityId, panelDimensions: resetSelected.panelDimensions, panelScreenSize: resetSelected.render.panelScreenSize, panelTexture: resetSelected.render.panelTexture, geometryKey: resetSelected.render.geometryKey, panelScale: resetSelected.panelScale, panelScaleRevision: resetSelected.panelScaleRevision };
  await page.evaluate(() => { const control = document.querySelector("#graphics-entity-panel-text"); control.value = "1.5"; control.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor(() => page.evaluate((selectedId) => window.rssDiagnostics.entityConstellationState().some((item) => item.entityId === selectedId && item.panelTextSettingScale === 1.5 && item.render.panelTextScale === 1.5), selectedConstellation.entityId), "independent entity-panel text scale");
  const textScaledConstellations = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const textScaledSelected = textScaledConstellations.find((item) => item.entityId === textScaleBaseline.entityId);
  if (!textScaledSelected || JSON.stringify(textScaledSelected.panelDimensions) !== JSON.stringify(textScaleBaseline.panelDimensions) || JSON.stringify(textScaledSelected.render.panelScreenSize) !== JSON.stringify(textScaleBaseline.panelScreenSize) || JSON.stringify(textScaledSelected.render.panelTexture) !== JSON.stringify(textScaleBaseline.panelTexture) || textScaledSelected.render.geometryKey !== textScaleBaseline.geometryKey || textScaledSelected.panelScale !== textScaleBaseline.panelScale || textScaledSelected.panelScaleRevision !== textScaleBaseline.panelScaleRevision) throw new Error(`Panel text scale changed entity-panel geometry: ${JSON.stringify({ before: textScaleBaseline, after: textScaledSelected })}`);
  if (await page.evaluate(() => JSON.parse(localStorage.getItem("rss-living-laboratory-graphics-v3") || "{}").entityPanelTextScale) !== 1.5) throw new Error("Entity-panel text scale was not persisted");
  assertIntegratedPanelContract(textScaledConstellations, constellationViewport, "Text-scaled ownership layout");
  await page.evaluate(() => { const control = document.querySelector("#graphics-entity-panel-text"); control.value = "1"; control.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor(() => page.evaluate((selectedId) => window.rssDiagnostics.entityConstellationState().some((item) => item.entityId === selectedId && item.panelTextSettingScale === 1 && item.render.panelTextScale === 1), selectedConstellation.entityId), "entity-panel text scale reset");
  checkpoint("uniform admitted-panel setting scale verified");
  await page.evaluate(() => { const control = document.querySelector("#hud-play"); if (control?.textContent === "Play") control.click(); });
  await waitFor(() => page.locator("#hud-play").evaluate((node) => node.textContent === "Pause"), "resumed simulation after uniform panel-scale fixture");
  const scaleBeforeWheel = { entityId: selectedConstellation.entityId, scale: selectedConstellation.panelScale, revision: selectedConstellation.panelScaleRevision, budgetCapacity: initialConstellationBudget.capacity, direction: selectedConstellation.panelScale >= 1.24 ? -1 : 1 };
  const simulationCanvas = page.locator("#viewport canvas");
  await simulationCanvas.hover();
  await page.mouse.wheel(0, scaleBeforeWheel.direction > 0 ? -360 : 360);
  await waitFor(() => page.evaluate((before) => window.rssDiagnostics.entityConstellationState().some((item) => item.entityId === before.entityId && item.panelScaleRevision > before.revision && (item.panelScale - before.scale) * before.direction > 1e-4), scaleBeforeWheel), "wheel-driven continuous ownership-panel scale");
  const wheelScaledConstellations = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const wheelScaledBudget = await page.evaluate(() => window.rssDiagnostics.entityConstellationBudgetState());
  assertIntegratedPanelContract(wheelScaledConstellations, constellationViewport, "Wheel-scaled ownership layout");
  if (wheelScaledBudget.capacity !== scaleBeforeWheel.budgetCapacity) throw new Error("Panel scale incorrectly changed viewport admission capacity");
  const scaledSelected = wheelScaledConstellations.find((item) => item.entityId === scaleBeforeWheel.entityId);
  const stableScaleRevision = scaledSelected.panelScaleRevision;
  const stableScaleByEntity = new Map(wheelScaledConstellations.map((item) => [item.entityId, item.panelScale]));
  const canvasBox = await simulationCanvas.boundingBox();
  if (!canvasBox) throw new Error("Simulation canvas had no interactive bounds");
  await page.mouse.move(canvasBox.x + canvasBox.width * .58, canvasBox.y + canvasBox.height * .52);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(canvasBox.x + canvasBox.width * .68, canvasBox.y + canvasBox.height * .58, { steps: 5 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(120);
  const rotatedConstellations = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const persistentAfterRotation = rotatedConstellations.filter((item) => stableScaleByEntity.has(item.entityId));
  if (!persistentAfterRotation.length || rotatedConstellations.some((item) => item.panelScaleRevision !== stableScaleRevision) || persistentAfterRotation.some((item) => Math.abs(item.panelScale - stableScaleByEntity.get(item.entityId)) > 1e-6)) throw new Error("Camera rotation changed ownership-panel scale without a wheel event");
  assertIntegratedPanelContract(rotatedConstellations, constellationViewport, "Camera-rotated ownership layout");
  await page.evaluate(() => window.rssDiagnostics.clearEntitySelection());
  await waitFor(() => page.evaluate(() => { const items = window.rssDiagnostics.entityConstellationState(); return items.length > 0 && items.every((item) => item.detailLevel === "panel" && !item.selected && !item.render.instrumentVisible); }), "public ownership budget after deselection");
  const deselectedConstellations = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const deselectedResources = await page.evaluate(() => window.rssDiagnostics.report().resources);
  if (deselectedResources.visibleInstrumentPanels !== 0 || deselectedResources.visibleEntityPanels !== deselectedConstellations.length) throw new Error(`Deselection did not restore only the strategic public-panel budget: ${JSON.stringify({ deselectedConstellations, deselectedResources })}`);
  assertIntegratedPanelContract(deselectedConstellations, constellationViewport, "Deselected strategic ownership layout");
  await page.evaluate(() => window.rssDiagnostics.prepareBaseline("follow"));
  await waitFor(() => page.evaluate((expectedId) => { const items = window.rssDiagnostics.entityConstellationState(); return items.length === 1 && items[0].entityId === expectedId && items[0].selected && items[0].detailLevel === "instrument"; }, followBaseline.selectedId), "restored exclusive selected instrument");
  checkpoint("ownership constellation verified");
  await waitFor(() => page.evaluate(() => {
    const resources = window.rssDiagnostics.report().resources;
    return resources.animalEyesTotal > 0 && resources.animalEyesAttachedToHeads === resources.animalEyesTotal;
  }), "eyes attached to animal heads");
  await waitFor(() => page.evaluate(() => window.rssDiagnostics.report().resources.cameraGroundClearance >= 2.39), "camera terrain clearance");
  const setOverlay = (selector, checked) => page.evaluate(({ selector, checked }) => { const input = document.querySelector(selector); input.checked = checked; input.dispatchEvent(new Event("change")); }, { selector, checked });
  await setOverlay("#overlay-organism-only", true);
  await waitFor(() => page.evaluate(() => {
    const resources = window.rssDiagnostics.report().resources;
    return resources.visibleAnimals === 1 && resources.visibleHealthBars === 0 && resources.visibleEnduranceBars === 0 && resources.visibleThoughts === 0;
  }), "clean selected-organism view");
  await setOverlay("#overlay-organism-only", false);
  await setOverlay("#overlay-memory", false); await setOverlay("#overlay-memory", true);
  await waitFor(() => page.locator("#hud-performance").evaluate((node) => /\d+ FPS/.test(node.textContent)), "strategic FPS summary");
  const selectionVisibilityBeforeGuideTest = await page.locator("#observer-selection").evaluate((node) => node.style.visibility);
  await page.locator("#observer-selection").evaluate((node) => { node.style.visibility = "hidden"; });
  const verifyDiagnosticGuideScroll = async (guideSelector, bodySelector, description) => {
    await page.evaluate((selector) => { const guide = document.querySelector(selector); guide.open = true; guide.scrollTop = 0; }, guideSelector);
    await waitFor(() => page.locator(guideSelector).evaluate((node) => node.open && node.scrollHeight > node.clientHeight), `${description} overflow`);
    await page.locator(bodySelector).hover();
    const orbitBefore = await page.evaluate(() => window.rssDiagnostics.report().resources.cameraOrbitDistance);
    await page.mouse.wheel(0, 320);
    await waitFor(() => page.locator(guideSelector).evaluate((node) => node.scrollTop > 0), `${description} wheel scroll`);
    const orbitAfter = await page.evaluate(() => window.rssDiagnostics.report().resources.cameraOrbitDistance);
    if (Math.abs(orbitAfter - orbitBefore) > .01) throw new Error(`${description} leaked its wheel event to the 3D camera: ${orbitBefore} -> ${orbitAfter}`);
  };
  await page.evaluate(() => { document.querySelector(".world-symbol-key").open = true; });
  await waitFor(() => page.locator(".world-symbol-key").evaluate((node) => node.open), "open world visual dictionary");
  const worldVisualLanguage = await page.evaluate(() => ({
    expressions: document.querySelectorAll('#symbol-key-content [data-legend-category="expressions"] [data-symbol-expression]').length,
    signalVariants: document.querySelectorAll('#symbol-key-content [data-legend-category="public-signal-variants"] .symbol-key-row').length,
    signalContracts: document.querySelectorAll('#symbol-key-content [data-legend-category="public-signal-contracts"] [data-symbol-contract]').length,
  }));
  if (JSON.stringify(worldVisualLanguage) !== JSON.stringify({ expressions: 18, signalVariants: 28, signalContracts: 22 })) throw new Error(`World visual dictionary was incomplete: ${JSON.stringify(worldVisualLanguage)}`);
  await verifyDiagnosticGuideScroll(".world-symbol-key", ".symbol-grammar-intro p", "world visual dictionary");
  await page.evaluate(() => { document.querySelector(".world-symbol-key").open = false; });
  await verifyDiagnosticGuideScroll(".entity-overlay-guide", ".entity-overlay-guide > .hint", "entity display guide");
  const guideLayout = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
    const contains = (outer, inner) => Boolean(outer && inner && inner.left >= outer.left - .5 && inner.right <= outer.right + .5 && inner.top >= outer.top - .5 && inner.bottom <= outer.bottom + .5);
    const expression = rect(".guide-card-expression"), expressionLabel = rect(".guide-card-expression small");
    const identity = rect(".guide-identity-rail"), identityMain = rect(".guide-identity-main"), pregnancy = rect(".guide-pregnancy"), identityCaption = rect(".guide-identity-caption");
    const changing = rect(".guide-changing"), call = rect(".guide-changing-row:first-child"), action = rect(".guide-changing-row:last-child");
    const card = rect(".guide-entity-card"), tether = rect(".guide-owner-tether"), animal = rect(".guide-animal"), world = rect(".guide-world-layout");
    return {
      channelsContained: contains(expression, expressionLabel) && contains(identity, identityMain) && contains(identity, pregnancy) && contains(identity, identityCaption) && contains(changing, call) && contains(changing, action),
      communicationRowsSeparated: Boolean(call && action && call.bottom <= action.top + .5),
      ownershipOrder: Boolean(card && tether && animal && world && card.bottom <= tether.top + .5 && tether.bottom <= animal.top + .5 && contains(world, animal)),
      noHorizontalOverflow: [expression, identity, changing].every(Boolean) && [...document.querySelectorAll(".guide-card-row > *")].every((node) => node.scrollWidth <= node.clientWidth + 1),
    };
  });
  if (!Object.values(guideLayout).every(Boolean)) throw new Error(`Entity display guide layout overlapped: ${JSON.stringify(guideLayout)}`);
  await page.evaluate(() => { document.querySelector(".entity-overlay-guide").open = false; });
  await page.locator("#observer-selection").evaluate((node, visibility) => { node.style.visibility = visibility; }, selectionVisibilityBeforeGuideTest);
  checkpoint("scrollable world dictionary and non-overlapping entity guide verified");
  await page.evaluate(() => {
    const inspector = document.querySelector(".inspector");
    if (inspector?.classList.contains("is-closed")) document.querySelector("#lab-toggle").click();
  });
  await page.evaluate(() => document.querySelector('[data-lab-tab="society"]')?.click());
  await waitFor(() => page.locator('#visual-language-workspace[data-visual-language-mini-rendered="true"]').count().then((count) => count === 1), "Mini Society visual-language catalogue");
  const setLaboratoryMode = async (mode) => {
    await page.evaluate((requestedMode) => {
      const inspector = document.querySelector(".inspector"), currentlyMain = inspector.classList.contains("is-main-laboratory");
      if ((requestedMode === "main") !== currentlyMain) document.querySelector("#laboratory-size-toggle").click();
    }, mode);
    await waitFor(() => page.locator(".inspector").evaluate((node, requestedMode) => node.classList.contains(requestedMode === "main" ? "is-main-laboratory" : "is-mini-laboratory"), mode), `${mode} Laboratory mode`);
  };
  await setLaboratoryMode("main");
  await waitFor(() => page.locator('#visual-language-workspace[data-visual-language-main-rendered="true"]').count().then((count) => count === 1), "Main Society visual-language catalogue");
  const mainVisualLanguage = await page.evaluate(() => {
    const root = document.querySelector("#visual-language-workspace"), main = root.querySelector('[data-visual-language-surface="main"]'), mini = root.querySelector('[data-visual-language-surface="mini"]');
    return {
      expressions: root.querySelectorAll("[data-visual-language-expression]").length,
      signalVariants: root.querySelectorAll("[data-visual-language-signal]").length,
      signalContracts: root.querySelectorAll("[data-visual-language-contract]").length,
      mainVisible: getComputedStyle(main).display !== "none" && main.getClientRects().length > 0,
      miniVisible: getComputedStyle(mini).display !== "none" && mini.getClientRects().length > 0,
    };
  });
  if (JSON.stringify(mainVisualLanguage) !== JSON.stringify({ expressions: 18, signalVariants: 28, signalContracts: 22, mainVisible: true, miniVisible: false })) throw new Error(`Main Society visual-language catalogue was incomplete: ${JSON.stringify(mainVisualLanguage)}`);
  await setLaboratoryMode("mini");
  const miniVisualLanguage = await page.evaluate(() => {
    const root = document.querySelector("#visual-language-workspace"), main = root.querySelector('[data-visual-language-surface="main"]'), mini = root.querySelector('[data-visual-language-surface="mini"]');
    return { mainVisible: getComputedStyle(main).display !== "none" && main.getClientRects().length > 0, miniVisible: getComputedStyle(mini).display !== "none" && mini.getClientRects().length > 0, catalogue: root.querySelector(".visual-language-mini-catalogue").textContent.replace(/\s+/g, " ").trim() };
  });
  if (miniVisualLanguage.mainVisible || !miniVisualLanguage.miniVisible || !miniVisualLanguage.catalogue.includes("18 expressions") || !miniVisualLanguage.catalogue.includes("28 callouts") || !miniVisualLanguage.catalogue.includes("22 contracts")) throw new Error(`Mini Society visual-language digest failed: ${JSON.stringify(miniVisualLanguage)}`);
  await page.evaluate(() => document.querySelector("[data-open-main-visual-language]").click());
  await waitFor(() => page.locator(".inspector").evaluate((node) => node.classList.contains("is-main-laboratory")), "Mini visual-language link opening Main Laboratory");
  await page.evaluate(() => document.querySelector('[data-lab-tab="predictive"]')?.click());
  await waitFor(() => page.locator("[data-cinema-observable-focus]").count().then((count) => count === 1), "Cinema observable-cue focus card");
  const cinemaObservableFocus = await page.evaluate(() => {
    const card = document.querySelector("[data-cinema-observable-focus]");
    return { visible: card.getClientRects().length > 0, basis: card.dataset.cinemaFocusBasis, title: card.querySelector("h3")?.textContent, summaries: card.querySelectorAll(".predictive-current-summary > article").length, cueStates: card.querySelectorAll("[data-cinema-cue-state]").length };
  });
  if (!cinemaObservableFocus.visible || !cinemaObservableFocus.basis || cinemaObservableFocus.title !== "Observable-cue focus" || cinemaObservableFocus.summaries !== 3 || cinemaObservableFocus.cueStates !== 2) throw new Error(`Cinema observable-cue focus card was incomplete: ${JSON.stringify(cinemaObservableFocus)}`);
  checkpoint("Society Main/Mini catalogues and Cinema observable focus verified");
  await setLaboratoryMode("mini");
  await page.evaluate(() => document.querySelector('[data-lab-tab="diagnostics"]')?.click());
  await page.evaluate(() => document.querySelector("#laboratory-benchmark summary").click());
  await waitFor(() => page.locator("#benchmark-start").isVisible(), "laboratory benchmark controls");
  await page.evaluate(() => document.querySelector("#benchmark-start").click());
  await waitFor(() => page.locator("#benchmark-status").evaluate((node) => node.textContent.startsWith("Stage")), "benchmark start");
  await page.waitForTimeout(1100);
  await page.evaluate(() => document.querySelector("#benchmark-start").click());
  checkpoint("population benchmark stopped");
  const benchmark = await page.locator("#benchmark-report").inputValue().then(JSON.parse);
  if (benchmark.benchmarkSchema !== 3 || benchmark.benchmarkKind !== "population-sweep" || !benchmark.stages?.length) throw new Error("Laboratory benchmark report was incomplete");
  if (benchmark.stages[0].finalResources.terrainMaterialDrawGroups > 12) throw new Error(`Terrain batching regressed to ${benchmark.stages[0].finalResources.terrainMaterialDrawGroups} draw groups`);
  const crowdedShowcase = await page.evaluate(() => window.rssDiagnostics.loadShowcase("pack-hunt"));
  await page.evaluate(() => {
    const style = document.querySelector("#graphics-entity-panel-style"), preset = document.querySelector("#graphics-entity-panel-preset"), scale = document.querySelector("#graphics-entity-panel");
    style.value = "full-instrument"; style.dispatchEvent(new Event("change", { bubbles: true }));
    preset.value = "full"; preset.dispatchEvent(new Event("change", { bubbles: true }));
    scale.value = "1"; scale.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await waitFor(() => page.evaluate((selectedId) => { const items = window.rssDiagnostics.entityConstellationState(); return items.length === 1 && items[0].entityId === selectedId && items[0].selected && items[0].detailLevel === "instrument"; }, crowdedShowcase.selectedId), "exclusive selected showcase instrument");
  await page.evaluate(() => window.rssDiagnostics.clearEntitySelection());
  await waitFor(() => page.evaluate(() => window.rssDiagnostics.entityConstellationState().some((item) => item.clusterSize > 1)), "crowded interaction constellations");
  const crowdedConstellations = await page.evaluate(() => window.rssDiagnostics.entityConstellationState());
  const crowdedConstellationBudget = await page.evaluate(() => window.rssDiagnostics.entityConstellationBudgetState());
  if (!crowdedConstellationBudget || crowdedConstellations.length > crowdedConstellationBudget.capacity) throw new Error("Crowded ownership panels exceeded their automatic screen budget");
  assertIntegratedPanelContract(crowdedConstellations, constellationViewport, "Crowded ownership layout");
  const crowdedOwnershipResources = await page.evaluate(() => window.rssDiagnostics.report().resources);
  if (crowdedOwnershipResources.visibleOwnershipTethers > crowdedConstellations.length) throw new Error("Crowded layout retained a stale off-screen tether");
  if (crowdedConstellations.some((item) => item.selected || item.detailLevel !== "panel")) throw new Error("Deselected crowded view did not use only public ownership rails");
  if (crowdedConstellations.some((item) => item.render.endpointShape !== item.style.shape)) throw new Error("Crowded ownership endpoint shape diverged from its redundant entity style");
  for (const clusterId of new Set(crowdedConstellations.map((item) => item.clusterId))) { const styles = crowdedConstellations.filter((item) => item.clusterId === clusterId).map((item) => item.style.styleIndex); if (new Set(styles).size !== styles.length) throw new Error(`Ownership style collision in visible cluster ${clusterId}`); }
  checkpoint("crowded interaction ownership verified");
  const defaultCinemaLayout = await page.evaluate(() => {
    const panel = document.querySelector("#movie-hud"); panel.hidden = false; panel.classList.remove("movie-hud-hidden", "has-custom-window-size"); panel.style.removeProperty("width"); panel.style.removeProperty("height");
    const rect = panel.getBoundingClientRect(), detail = panel.querySelector("#movie-shot-detail"), control = panel.querySelector(".movie-control-grid label"), title = panel.querySelector(".movie-hud-heading strong"), shotTitle = panel.querySelector(".movie-shot-copy strong");
    return { visualWidth: rect.width, authoredWidth: Number.parseFloat(getComputedStyle(panel).width), horizontalOverflow: panel.scrollWidth - panel.clientWidth, detailFont: Number.parseFloat(getComputedStyle(detail).fontSize), controlFont: Number.parseFloat(getComputedStyle(control).fontSize), titleFont: Number.parseFloat(getComputedStyle(title).fontSize), shotTitleFont: Number.parseFloat(getComputedStyle(shotTitle).fontSize) };
  });
  if (Math.abs(defaultCinemaLayout.authoredWidth - 520) > 1 || defaultCinemaLayout.visualWidth < 430) throw new Error(`Cinema default width regressed: ${JSON.stringify(defaultCinemaLayout)}`);
  if (defaultCinemaLayout.horizontalOverflow > 1) throw new Error(`Cinema default layout overflowed horizontally by ${defaultCinemaLayout.horizontalOverflow}px`);
  if (defaultCinemaLayout.detailFont < 14 || defaultCinemaLayout.controlFont >= defaultCinemaLayout.detailFont || defaultCinemaLayout.titleFont < defaultCinemaLayout.detailFont || defaultCinemaLayout.titleFont > 20 || defaultCinemaLayout.shotTitleFont <= defaultCinemaLayout.titleFont) throw new Error(`Cinema typography hierarchy regressed: ${JSON.stringify(defaultCinemaLayout)}`);
  await page.evaluate(() => { const panel = document.querySelector("#movie-hud"); panel.classList.add("managed-resizable-window", "has-custom-window-size"); panel.style.width = "320px"; panel.style.height = "600px"; for (const disclosure of panel.querySelectorAll("details")) disclosure.open = true; });
  await page.waitForTimeout(80);
  const narrowCinemaLayout = await page.evaluate(() => {
    const panel = document.querySelector("#movie-hud"), content = panel.getBoundingClientRect(), grids = [...panel.querySelectorAll(".movie-control-grid")].filter(node => node.getClientRects().length), toggles = panel.querySelector(".movie-output-toggles");
    const escapedControl = [...panel.querySelectorAll("select,button,input,textarea")].filter(node => node.getClientRects().length).some(node => { const rect = node.getBoundingClientRect(); return rect.left < content.left - 1 || rect.right > content.right + 1; });
    const result = { horizontalOverflow: panel.scrollWidth - panel.clientWidth, controlGridColumns: grids.map(node => getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length), toggleColumns: getComputedStyle(toggles).gridTemplateColumns.trim().split(/\s+/).length, escapedControl };
    panel.hidden = true; panel.classList.remove("has-custom-window-size"); panel.style.removeProperty("width"); panel.style.removeProperty("height"); return result;
  });
  if (narrowCinemaLayout.horizontalOverflow > 1 || narrowCinemaLayout.escapedControl || narrowCinemaLayout.toggleColumns !== 2 || narrowCinemaLayout.controlGridColumns.some(count => count !== 1)) throw new Error(`Cinema narrow layout failed to reflow: ${JSON.stringify(narrowCinemaLayout)}`);
  checkpoint("Cinema default typography and narrow reflow verified");
  if (await page.locator("#startup-error").count()) throw new Error("startup error was displayed");
  if (errors.length) throw new Error(`Browser page errors: ${errors.join("; ")}`);
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
  process.stdout.write(`Headless Chromium smoke passed: ${benchmark.stages[0].finalResources["renderer.info.render.calls"]} draw calls, ${benchmark.stages[0].finalResources.terrainMaterialDrawGroups} terrain material groups; deterministic time skip and visual invariants verified.\n`);
} catch (error) {
  if (page) { await mkdir(join(root, "test-results"), { recursive: true }); await page.screenshot({ path: join(root, "test-results", "browser-smoke-failure.png"), fullPage: true }).catch(() => {}); }
  process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1;
} finally {
  const bounded = (promise, timeout = 3_000) => Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]);
  if (context) await bounded(context.close().catch(() => {}));
  if (browser) await bounded(browser.close().catch(() => {}));
  if (browserServer) await bounded(browserServer.kill().catch(() => {}));
  server.closeAllConnections?.();
  await bounded(new Promise((resolve) => server.close(resolve)));
  process.exit(process.exitCode || 0);
}
