import { expect, test } from "@playwright/test";

test("water commitment thresholds and Laboratory diagnostics initialise", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/?test=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  const contract = await page.evaluate(async () => {
    const water = await import("/src/water-commitment.js");
    return {
      acquisition: water.HYDRATION_ACQUISITION_TARGET,
      reentry: water.HYDRATION_REENTRY_LEVEL,
      threatPrecedence: water.immediateThreatPrecedesWater({ action: "flee", urgency: 80 }),
    };
  });
  expect(contract).toEqual({ acquisition: 92, reentry: 85, threatPrecedence: true });
  await page.evaluate(() => window.rssDiagnostics.prepareBaseline("follow"));
  await page.evaluate(() => {
    document.querySelector("#lab-toggle").click();
    document.querySelector("#laboratory-size-toggle").click();
    document.querySelector("#laboratory-tab-planning").click();
  });
  await expect(page.locator("#need-planning-live")).toContainText("Water target and safety arbitration");
  await expect(page.locator("#need-planning-live")).toContainText("Why not flee?");
  await expect(page.locator("#startup-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
});

test("acoustic ecology controls, profiles, and procedural audio initialise", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/?test=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  const weatherField = await page.evaluate(() => window.rssDiagnostics.weatherFieldState());
  expect(weatherField.cells).toBeGreaterThan(0);
  expect(weatherField.dryCells).toBeGreaterThan(0);
  await page.locator(".acoustic-controls > summary").click();
  await expect(page.locator("#sensory-perspective")).toHaveValue("human-observer");
  await expect(page.locator("#audio-enabled")).not.toBeChecked();
  const catalogue = await page.evaluate(async () => { const profiles = await import("/src/acoustic-profiles.js"), scores = await import("/src/acoustic-score.js"), settings = await import("/src/audio-settings.js"); return { count: Object.keys(profiles.SPECIES_ACOUSTIC_PROFILES).length, scoreCount: scores.SPECIES_SIGNATURE_IDS.length, languages: settings.SOUND_LANGUAGE_IDS.length, errors: profiles.validateAcousticProfiles(), founders: [profiles.SPECIES_ACOUSTIC_PROFILES.grazer.scientificName, profiles.SPECIES_ACOUSTIC_PROFILES.hunter.scientificName] }; });
  expect(catalogue).toEqual({ count: 26, scoreCount: 26, languages: 5, errors: [], founders: ["Cervus elaphus", "Canis lupus"] });
  await page.locator("#sensory-perspective").selectOption("physical-scientific");
  await expect(page.locator("#sensory-perspective-status")).toContainText("Physical field before biological filtering");
  await page.locator("#audio-enabled").click();
  await expect(page.locator("#sound-language-selector")).toBeVisible();
  await expect(page.locator("#audio-enabled")).not.toBeChecked();
  await page.locator('[data-sound-language-select="bioacoustic-signature"]').click();
  await expect(page.locator("#sound-language-selector")).toBeHidden();
  await expect(page.locator("#audio-enabled")).not.toBeChecked();
  await page.locator("#graphics-open").click();
  await expect(page.locator("#settings-audio-enabled")).not.toBeChecked();
  await expect(page.locator("#settings-audio-animals")).toHaveValue("0.9");
  await expect(page.locator("#settings-audio-language")).toHaveValue("bioacoustic-signature");
  await expect(page.locator("#settings-audio-wind")).toHaveValue("0.7");
  await expect(page.locator("#settings-audio-vegetation")).toHaveValue("0.68");
  await expect(page.locator("#settings-audio-rain")).toHaveValue("0.82");
  await expect(page.locator("#settings-audio-river")).toHaveValue("0.76");
  await page.locator("#settings-audio-dynamic-range").selectOption("night");
  await page.locator("#settings-audio-spatialization").selectOption("mono");
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("rss-laboratory-audio-settings-v3")));
  expect(persisted.dynamicRange).toBe("night"); expect(persisted.spatialization).toBe("mono"); expect(persisted.soundLanguage).toBe("bioacoustic-signature");
  await page.evaluate(() => document.querySelector("#step")?.click());
  await page.evaluate(() => { document.querySelector("#graphics-close")?.click(); document.querySelector("#lab-toggle")?.click(); document.querySelector("#laboratory-size-toggle")?.click(); document.querySelector("#laboratory-tab-acoustics")?.click(); });
  await expect(page.locator("#acoustic-laboratory-workspace")).toContainText(/Acoustic evidence|No authoritative sound event/);
  await expect(page.locator("#startup-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
});

test("Map clears focus and visibly reframes the complete world", async ({ page }) => {
  await page.goto("/?test=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await page.evaluate(() => window.rssDiagnostics.prepareBaseline("follow"));
  const before = await page.evaluate(() => ({ selection: window.rssDiagnostics.observerSelectionState(), camera: window.rssDiagnostics.movieState().camera }));
  expect(before.selection.selectedId).toBeTruthy();
  await page.locator("#hud-map").click();
  const after = await page.evaluate(() => ({ selection: window.rssDiagnostics.observerSelectionState(), camera: window.rssDiagnostics.movieState().camera }));
  expect(after.selection.selectedId).toBeNull();
  expect(after.selection.selectedGroupId).toBeNull();
  expect(Math.hypot(after.camera.x - before.camera.x, after.camera.y - before.camera.y, after.camera.z - before.camera.z)).toBeGreaterThan(10);
  await expect(page.locator("#hud-event")).toContainText("Map overview: whole world framed");
});

test("a named-save shortcut restores its world and enters the simulation", async ({ page }) => {
  test.setTimeout(60_000);
  const slotName = `shortcut-${Date.now()}`;
  await page.goto("/?test=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  page.once("dialog", dialog => dialog.accept(slotName));
  await page.evaluate(() => document.querySelector("#save-slot").click());
  await expect.poll(() => page.evaluate(name => JSON.parse(localStorage.getItem("rss-lab-save-slot-names-v1") || "[]").some(slot => (typeof slot === "string" ? slot : slot.name) === name), slotName)).toBe(true);

  await page.goto("/");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await page.locator("#menu-save-load").click();
  await page.locator("#game-menu-save-slot-list [data-save-slot]").filter({ hasText: slotName }).click();
  await expect(page.locator("#game-menu")).toBeHidden();
  await expect(page.locator("#hud-event")).toContainText(`Loaded slot: ${slotName}`, { timeout: 20_000 });

  await page.goto(`/?test=1&slot=${encodeURIComponent(slotName)}`);
  await expect(page.locator("#hud-event")).toContainText(`Loaded slot: ${slotName}`, { timeout: 20_000 });
  await expect(page.locator("#game-menu")).toBeHidden();
  await expect(page.locator("#run-state")).toHaveText("Running");
  await expect.poll(() => page.evaluate(() => new URLSearchParams(location.search).has("slot"))).toBe(false);
});

test("small test-mode world starts and renders", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#overlay-vision")).toBeAttached();
  await expect(page.locator("#overlay-smell")).toBeAttached();
  await expect(page.locator("#overlay-perception")).toHaveCount(0);
  await expect(page.locator("#overlay-vision")).toBeChecked();
  await expect(page.locator("#overlay-health-bars")).toBeChecked();
  await expect(page.locator("#overlay-endurance-bar")).toBeChecked();
  await expect(page.locator("#overlay-composition-bar")).toBeChecked();
  await expect(page.locator("#overlay-memory")).not.toBeChecked();
  await expect(page.locator("#overlay-water")).not.toBeChecked();
  await expect(page.locator("#symbol-key-content")).toBeAttached();
  await expect(page.locator("#laboratory-tab-planning")).toBeAttached();
  await page.evaluate(() => {
    window.rssDiagnostics.prepareBaseline("follow");
    document.querySelector("#play-pause").click();
  });
  await page.evaluate(() => document.querySelector("#laboratory-tab-planning").click());
  await expect(page.locator("#need-planning-live")).toContainText("Current commitment");
  await expect(page.locator("#need-planning-live")).toContainText(/Current dependency plan|No dependency plan has been instantiated/);
  await expect(page.locator("#need-ontology-complete")).toContainText("Maintain survival");
  const needBranchCount = await page.evaluate(async () => (await import("/src/need-ontology-presentation.js")).NEED_ONTOLOGY.length);
  await expect(page.locator("#need-ontology-complete .ontology-branches > .ontology-branch")).toHaveCount(needBranchCount);
  await expect(page.locator("#startup-error")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.report().resources["renderer.info.render.calls"])).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
  await page.goto("about:blank");
  await page.close();
});

test("readable first-run typography and Main Laboratory geometry remain correct at every interface scale", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await expect(page.locator("#interface-scale")).toHaveValue("0.85");
  await expect(page.locator("#font-scale")).toHaveValue("1");
  await expect(page.locator("#font-small-scale")).toHaveValue("1.5");
  await expect(page.locator("#font-body-scale")).toHaveValue("1.75");
  await expect(page.locator("#font-control-scale")).toHaveValue("1.3");
  await expect(page.locator("#font-heading-scale")).toHaveValue("1");
  await expect(page.locator("#font-title-scale")).toHaveValue("1");

  await page.locator("#lab-toggle").click();
  await page.locator("#laboratory-size-toggle").click();
  await expect(page.locator(".inspector")).toHaveClass(/is-main-laboratory/);
  await page.waitForTimeout(250);
  for (const scale of ["0.85", "1", "1.3"]) {
    await page.evaluate((value) => { const control = document.querySelector("#interface-scale"); control.value = value; control.dispatchEvent(new Event("change", { bubbles: true })); }, scale);
    await page.waitForTimeout(80);
    const geometry = await page.locator(".inspector").evaluate((element) => { const box = element.getBoundingClientRect(); return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, zoom: getComputedStyle(element).zoom }; });
    expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.right - geometry.viewportWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.bottom - geometry.viewportHeight)).toBeLessThanOrEqual(1);
    expect(Number(geometry.zoom)).toBeCloseTo(Number(scale), 2);
  }
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
  await page.goto("about:blank");
  await page.close();
});

test("Escape recovery menu preserves pause state and restores closed, minimised, and resized windows", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");

  await page.locator('[data-close-window="observer"]').click();
  await expect(page.locator("#observer-hud")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#escape-menu")).toBeVisible();
  await expect(page.locator("#game-menu")).toBeHidden();
  const observerRecovery = page.locator('[data-escape-window="observer"]');
  await expect(observerRecovery).toContainText("Closed");
  await observerRecovery.click();
  await expect(observerRecovery).toContainText("Shown");
  await page.locator("#escape-resume").click();
  await expect(page.locator("#observer-hud")).toBeVisible();
  expect((await page.evaluate(() => window.rssDiagnostics.windowManagementState())).running).toBe(false);

  await page.locator("#observer-hud-toggle").click();
  await expect(page.locator("#observer-hud")).toBeHidden();
  await expect(page.locator("#window-dock")).toBeVisible();
  await page.locator('[data-restore-window="observer"]').click();
  await expect(page.locator("#observer-hud")).toBeVisible();

  const handle = page.locator('#observer-hud > .window-resize-handle'), before = await page.locator("#observer-hud").boundingBox();
  await handle.focus(); await handle.press("ArrowRight"); await handle.press("ArrowDown");
  const after = await page.locator("#observer-hud").boundingBox(), stored = await page.evaluate(() => JSON.parse(localStorage.getItem("rss-window-sizes-v1") || "{}").observer);
  expect(after.width).toBeGreaterThan(before.width);
  expect(after.height).toBeGreaterThan(before.height);
  expect(stored.width).toBeGreaterThan(300);
  expect(stored.height).toBeGreaterThan(210);

  await page.locator("#hud-play").click();
  expect((await page.evaluate(() => window.rssDiagnostics.windowManagementState())).running).toBe(true);
  await page.keyboard.press("Escape");
  expect((await page.evaluate(() => window.rssDiagnostics.windowManagementState())).running).toBe(false);
  await page.keyboard.press("Escape");
  expect((await page.evaluate(() => window.rssDiagnostics.windowManagementState())).running).toBe(true);
  await page.locator("#hud-play").click();
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  expect((await page.evaluate(() => window.rssDiagnostics.windowManagementState())).running).toBe(false);
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
  await page.goto("about:blank");
  await page.close();
});

test("a persisted Predictive Laboratory restores as a readable visual explanation", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("rss-laboratory-display-mode-v1", "main");
    localStorage.setItem("rss-laboratory-tab-v1", "predictive");
  });
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await page.locator("#lab-toggle").click();
  await expect(page.locator(".inspector")).not.toHaveClass(/is-closed/);
  await page.evaluate(() => window.rssDiagnostics.prepareBaseline("follow"));
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
  const panel = page.locator("#laboratory-panel-predictive");
  await expect(panel).toBeVisible();
  await expect(page.locator("#predictive-systems-workspace")).toBeVisible();
  await expect(page.locator("#predictive-animal-detail")).toContainText("predictive mind");
  await expect(page.locator("#predictive-cinema-detail")).toContainText("Cinema Mode predictive coalition");

  await expect(panel.locator("pre")).toHaveCount(0);
  await expect(panel.locator(".predictive-raw")).toHaveCount(0);
  for (const forbidden of ["Evidence ID", "Evidence references", "Complete serialized cognition state", "Complete ACSS diagnostic snapshot"]) await expect(panel).not.toContainText(forbidden);

  const renderedText = await panel.evaluate(element => element.textContent || "");
  expect(renderedText).not.toMatch(/\b\d+:(?:sight|hearing|smell|memory|proximity):[^\s·]+/i);
  expect(renderedText).not.toMatch(/"(?:status|water|hunt|safety|rest|x|z)"\s*:/i);

  for (const diagram of ["automatic-mode-allocation", "animal-information-flow", "cinema-truth-flow"]) await expect(panel.locator(`[data-predictive-diagram="${diagram}"]`)).toHaveCount(1);

  const lifecycleTable = panel.locator("table.predictive-table").filter({ hasText: "Target / referent" }).first();
  await expect(lifecycleTable).toBeAttached();
  const lifecycleHeaders = await lifecycleTable.locator("thead th").evaluateAll(cells => cells.map(cell => cell.textContent.trim()));
  expect(lifecycleHeaders).toEqual(["Process", "Framework", "Activated", "Admission", "Influence", "Authority", "Target / referent", "Horizon", "Confidence", "Cost"]);

  await page.evaluate(() => document.querySelector("[data-open-predictive-reference]").click());
  await expect(page.locator("#laboratory-panel-reference")).toBeVisible();
  await page.locator("#laboratory-reference-search").fill("predict");
  for (const id of ["predictive-systems", "predictive-scheduler", "predictive-evidence", "predictive-contracts", "predictive-lifecycle", "predictive-decisions", "predictive-learning", "predictive-examples", "cinema-predictive"]) await expect(page.locator(`#reference-${id}`)).toBeVisible();
  await expect.poll(() => page.locator(".reference-article:visible").count()).toBeGreaterThanOrEqual(9);
  await expect(page.locator("#laboratory-reference-empty")).toBeHidden();

  await expect(page.locator("#startup-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
  await page.goto("about:blank");
  await page.close();
});

test("all selected-organism views use the compact layout without clipping information", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await page.evaluate(() => window.rssDiagnostics.prepareBaseline("follow"));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());

  const panel = page.locator("#observer-selection"), detail = panel.locator(".observer-detail");
  await expect(panel).toBeVisible();
  const views = [
    ["details", "[data-observer-overview]"],
    ["memory", "[data-observer-social-visual-guide]"],
    ["priorities", ".observer-fuel-panel"],
    ["predictive", "[data-predictive-surface='observer-tab']"],
    ["view", "[data-observer-overlay]"]
  ];
  for (const [tab, marker] of views) {
    await panel.locator(`[data-observer-tab="${tab}"]`).click();
    await expect(detail.locator(marker).first()).toBeVisible();
    const overflow = await detail.evaluate(node => node.scrollWidth - node.clientWidth);
    expect(overflow, `${tab} has no horizontal overflow`).toBeLessThanOrEqual(1);
  }
  await panel.locator('[data-observer-tab="memory"]').click();
  await expect(panel.locator("[data-social-visual-explanation]")).toHaveCount(4);
  await expect(panel.locator("[data-social-visual-channel]")).toHaveCount(4);
  const socialSymbolLayout = await panel.locator("[data-observer-social-visual-guide]").evaluate(node => {
    const bays = [...node.querySelectorAll("[data-social-visual-channel]")].map(element => element.getBoundingClientRect()), explanations = node.querySelector("[data-observer-symbol-explanations]")?.getBoundingClientRect();
    return { square: bays.every(box => Math.abs(box.width - box.height) <= 1.5), explanationsBelow: Boolean(explanations) && explanations.top >= Math.max(...bays.map(box => box.bottom)) - 1 };
  });
  expect(socialSymbolLayout.square, "all four canonical social symbols occupy square bays").toBe(true);
  expect(socialSymbolLayout.explanationsBelow, "channel explanations start below the symbol grid").toBe(true);
  await expect(panel.locator(".observer-social-channel-note")).toHaveCount(0);

  await panel.locator('[data-observer-tab="predictive"]').click();
  const forecastMeters = panel.locator('[data-predictive-surface="observer-tab"] [role="meter"][aria-valuenow]');
  await expect.poll(() => forecastMeters.count()).toBeGreaterThan(0);
  const forecastValues = await forecastMeters.evaluateAll(nodes => nodes.map(node => Number(node.getAttribute("aria-valuenow"))));
  expect(forecastValues.every(value => Number.isFinite(value) && value >= 0 && value <= 100), "forecast confidence meters remain bounded").toBe(true);
  const forecastOverflow = await panel.locator('[data-predictive-surface="observer-tab"]').evaluate(node => node.scrollWidth - node.clientWidth);
  expect(forecastOverflow, "confidence-ring forecast cards do not overflow the organism panel").toBeLessThanOrEqual(1);

  const tabRows = await panel.locator("[data-observer-tab]").evaluateAll(nodes => new Set(nodes.map(node => Math.round(node.getBoundingClientRect().top))).size);
  expect(tabRows).toBe(1);
  const chromeGeometry = await panel.evaluate((node) => {
    const detail = node.querySelector(".observer-detail"), panelBox = node.getBoundingClientRect(), detailBox = detail.getBoundingClientRect();
    const ordered = [node.querySelector(".selection-heading"), node.querySelector("#hud-selected-name"), node.querySelector("#hud-selected-action"), node.querySelector(".hud-controls"), node.querySelector(".observer-tabs"), detail].map(element => element.getBoundingClientRect());
    const buttonHeights = [...node.querySelectorAll(".selection-heading button, .hud-controls button, .observer-tabs button")].map(button => button.getBoundingClientRect().height);
    return {
      chromeHeight: detailBox.top - panelBox.top,
      detailRatio: detail.clientHeight / panelBox.height,
      panelWithinViewport: panelBox.top >= 0 && panelBox.bottom <= innerHeight + 1,
      panelOverflow: node.scrollHeight - node.clientHeight,
      orderedWithoutOverlap: ordered.every((box, index) => index === 0 || box.top >= ordered[index - 1].bottom - 1),
      shortestButton: Math.min(...buttonHeights)
    };
  });
  expect(chromeGeometry.chromeHeight).toBeLessThanOrEqual(185);
  expect(chromeGeometry.detailRatio).toBeGreaterThanOrEqual(.65);
  expect(chromeGeometry.panelWithinViewport).toBe(true);
  expect(chromeGeometry.panelOverflow).toBeLessThanOrEqual(1);
  expect(chromeGeometry.orderedWithoutOverlap).toBe(true);
  expect(chromeGeometry.shortestButton).toBeGreaterThanOrEqual(24);
  await panel.locator('[data-observer-tab="predictive"]').click();
  const waterMedallion = panel.locator('[data-prediction-model-symbol="water-availability"]').first();
  await expect(waterMedallion).toBeVisible();
  const waterSymbolGeometry = await waterMedallion.evaluate((host) => {
    const symbol = host.querySelector('[data-prediction-symbol="water-availability"]'), hostBox = host.getBoundingClientRect(), symbolBox = symbol.getBoundingClientRect();
    return { widthRatio: symbolBox.width / hostBox.width, centreX: (symbolBox.left + symbolBox.width / 2) - (hostBox.left + hostBox.width / 2), centreY: (symbolBox.top + symbolBox.height / 2) - (hostBox.top + hostBox.height / 2) };
  });
  expect(waterSymbolGeometry.widthRatio).toBeGreaterThanOrEqual(.75);
  expect(Math.abs(waterSymbolGeometry.centreX)).toBeLessThanOrEqual(1);
  expect(Math.abs(waterSymbolGeometry.centreY)).toBeLessThanOrEqual(1);
  const impactGeometry = await panel.locator(".entity-predictive-impact").evaluate((impact) => ({
    height: impact.getBoundingClientRect().height,
    rows: [...impact.children].map((row) => {
      const box = row.getBoundingClientRect(), label = row.querySelector("dt").getBoundingClientRect(), value = row.querySelector("dd").getBoundingClientRect();
      return { widthShare: value.width / box.width, valueTop: value.top, labelBottom: label.bottom, valueFont: Number.parseFloat(getComputedStyle(row.querySelector("dd")).fontSize) };
    })
  }));
  expect(impactGeometry.height).toBeLessThan(220);
  for (const row of impactGeometry.rows) {
    expect(row.widthShare).toBeGreaterThan(.85);
    expect(row.valueTop).toBeGreaterThanOrEqual(row.labelBottom - 1);
    expect(row.valueFont).toBeLessThan(12);
  }

  await expect(page.locator("#startup-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.goto("about:blank");
  await page.close();
});
