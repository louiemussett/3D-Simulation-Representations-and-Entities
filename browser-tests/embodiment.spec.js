import { test, expect } from "@playwright/test";

test("camera-only multi-world stress playtest", async ({ page }, testInfo) => {
  await page.goto("/?test=1"); await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  const reports = [];
  for (let index = 0; index < 5; index += 1) {
    const seed = 18100 + index; await page.evaluate(seedValue => window.rssDiagnostics.startEmbodied("hard", "herbivore", seedValue), seed); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState()); await page.waitForTimeout(250);
    const before = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState()), canvas = page.locator("#viewport canvas"), box = await canvas.boundingBox(), direction = index % 2 ? -1 : 1;
    await page.mouse.move(box.x + box.width * .52, box.y + box.height * .5); await page.mouse.down({ button: "right" }); await page.mouse.move(box.x + box.width * (.52 + .16 * direction), box.y + box.height * (.39 + .05 * index), { steps: 7 }); await page.mouse.up({ button: "right" }); await page.waitForTimeout(260);
    await page.mouse.wheel(0, index % 2 ? -260 : 260); await page.waitForTimeout(500); const after = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
    reports.push({ seed, before, after });
  }
  const beforeCollapse = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState()); await page.locator("#observer-selection-toggle").click(); await page.waitForTimeout(80); const duringCollapse = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState()); await page.waitForTimeout(700); const afterCollapse = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  await page.screenshot({ path: testInfo.outputPath("camera-multi-world.png") });
  console.log("CAMERA_MULTI_WORLD", JSON.stringify({ reports, panel: { beforeCollapse, duringCollapse, afterCollapse } }));
  for (const report of reports) { expect(report.after.camera.terrainClearance).toBeGreaterThanOrEqual(.94); expect(report.after.camera.requestedDistance).toBeGreaterThanOrEqual(5.5); expect(report.after.camera.requestedDistance).toBeLessThanOrEqual(12.5); }
  expect(Math.abs(duringCollapse.camera.safeAreaNdc - beforeCollapse.camera.safeAreaNdc)).toBeLessThan(Math.abs(afterCollapse.camera.safeAreaNdc - beforeCollapse.camera.safeAreaNdc));
});

test("camera-only playtest telemetry", async ({ page }, testInfo) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 17321));
  await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState());
  const sample = () => page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  const idleStart = await sample(); await page.waitForTimeout(1400); const idleEnd = await sample();
  const canvas = page.locator("#viewport canvas"), box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .52, box.y + box.height * .48); await page.mouse.down({ button: "right" }); await page.mouse.move(box.x + box.width * .72, box.y + box.height * .34, { steps: 8 }); await page.mouse.up({ button: "right" }); await page.waitForTimeout(120);
  const manual = await sample(); await page.waitForTimeout(500); const manualHeld = await sample(); await page.waitForTimeout(900); const recentered = await sample();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.wheel(0, 320); await page.waitForTimeout(180); const zoomed = await sample(); await page.waitForTimeout(1200); const zoomSettled = await sample();
  await page.keyboard.down("KeyW"); await page.waitForTimeout(900); await page.keyboard.up("KeyW"); await page.waitForTimeout(160); const followed = await sample();
  await page.screenshot({ path: testInfo.outputPath("camera-only-hard.png") });
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("insane-immersion", "herbivore", 17322)); await page.waitForTimeout(350); const sensory = await sample();
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("impossible-immersion", "herbivore", 17323)); await page.waitForTimeout(350); const indirect = await sample();
  console.log("CAMERA_PLAYTEST", JSON.stringify({ idle: { start: idleStart.camera, end: idleEnd.camera }, manual: { yaw: manual.camera.yaw, heldYaw: manualHeld.camera.yaw, recenteredYaw: recentered.camera.yaw }, zoom: { requested: zoomed.camera.requestedDistance, settled: zoomSettled.camera.collisionDistance }, followed: followed.camera, sensory: sensory.camera, indirect: indirect.camera }));
  expect(idleEnd.camera.requestedDistance).toBe(idleStart.camera.requestedDistance);
  expect(Math.hypot(idleEnd.camera.x - idleStart.camera.x, idleEnd.camera.y - idleStart.camera.y, idleEnd.camera.z - idleStart.camera.z)).toBeLessThan(.12);
  expect(Math.abs(recentered.camera.yaw - manual.camera.yaw)).toBeLessThan(.015);
  expect(manualHeld.camera.collisionDistance).toBeGreaterThanOrEqual(2.39);
  expect(zoomSettled.camera.requestedDistance).toBe(zoomed.camera.requestedDistance);
  expect(zoomSettled.camera.requestedDistance).toBeLessThanOrEqual(12.5);
  expect(followed.camera.terrainClearance).toBeGreaterThanOrEqual(.94);
  expect(Math.abs(followed.camera.safeAreaNdc)).toBeGreaterThan(.05);
  expect(sensory.camera.context).toBe("sensory");
  expect(Math.abs(sensory.camera.y - sensory.camera.targetY)).toBeLessThan(.05);
  expect(indirect.camera.context).toBe("indirect");
});

test("embodied navigation has camera-relative movement and independent camera state", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 12001));
  await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState());
  const before = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  await page.keyboard.down("KeyW"); await page.waitForTimeout(700); await page.keyboard.up("KeyW"); await page.waitForTimeout(100);
  const moved = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  expect(Math.hypot(moved.animal.x - before.animal.x, moved.animal.z - before.animal.z)).toBeGreaterThan(.08);
  expect(moved.camera.requestedDistance).toBe(before.camera.requestedDistance);
  const canvas = page.locator("#viewport canvas"), box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down({ button: "right" }); await page.mouse.move(box.x + box.width * .65, box.y + box.height * .42, { steps: 6 }); await page.mouse.up({ button: "right" }); await page.waitForTimeout(100);
  const looked = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  expect(Math.abs(looked.camera.yaw - moved.camera.yaw)).toBeGreaterThan(.05);
  expect(Math.abs(looked.animal.orientation - moved.animal.orientation)).toBeLessThan(.08);
});

test("selection ring and facing arrow remain persistent while crossing terrain cells", async ({ page }) => {
  await page.goto("/?test=1"); await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  await page.evaluate(() => { window.rssDiagnostics.startEmbodied("hard", "herbivore", 12001); window.rssDiagnostics.clear(); window.rssDiagnostics.enable(); }); await page.waitForFunction(() => window.rssDiagnostics.selectionIndicatorState()?.visible);
  const before = await page.evaluate(() => window.rssDiagnostics.selectionIndicatorState());
  await page.keyboard.down("KeyW"); await page.waitForTimeout(4200); await page.keyboard.up("KeyW"); await page.waitForTimeout(200);
  const after = await page.evaluate(() => window.rssDiagnostics.selectionIndicatorState()), profile = await page.evaluate(() => window.rssDiagnostics.report());
  const topTimings = Object.entries(profile.timings).filter(([, timing]) => timing.samples).sort((left, right) => right[1].maximumMs - left[1].maximumMs).slice(0, 14);
  console.log("MOVEMENT_REFRESH_PROFILE", JSON.stringify({ frame: profile.timings["frame.total"], tick: profile.timings["tick.total"], topTimings, resources: { geometries: profile.resources["renderer.info.memory.geometries"], backlog: profile.resources.simulationTickBacklog } }));
  expect(after.root).toBe(before.root); expect(after.ring).toBe(before.ring); expect(after.arrowLine).toBe(before.arrowLine);
  expect(profile.resources.simulationTickBacklog).toBeLessThan(2);
});

test("alternating WASD cannot leave the controlled body trapped at a navmesh edge", async ({ page }) => {
  await page.goto("/?test=1"); await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 12019)); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState());
  for (let cycle = 0; cycle < 4; cycle += 1) {
    const distances = [];
    for (const key of ["KeyW", "KeyA", "KeyS", "KeyD"]) { const before = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState().animal); await page.keyboard.down(key); await page.waitForTimeout(420); await page.keyboard.up(key); await page.waitForTimeout(80); const after = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState().animal); distances.push(Math.hypot(after.x - before.x, after.z - before.z)); }
    expect(Math.max(...distances)).toBeGreaterThan(.025);
  }
});

test("A and D follow screen direction, S travels, and arrows move only the head", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  const start = async seed => { await page.evaluate(value => window.rssDiagnostics.startEmbodied("hard", "herbivore", value), seed); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState()); await page.waitForTimeout(180); return page.evaluate(() => window.rssDiagnostics.embodiedGameplayState()); };
  const hold = async (key, milliseconds) => { await page.keyboard.down(key); await page.waitForTimeout(milliseconds); await page.keyboard.up(key); await page.waitForTimeout(100); return page.evaluate(() => window.rssDiagnostics.embodiedGameplayState()); };
  const beforeA = await start(12101), afterA = await hold("KeyA", 400);
  const beforeD = await start(12102), afterD = await hold("KeyD", 400);
  const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle)), desiredHeading = (before, localRight) => Math.atan2(Math.sin(before.camera.yaw) * localRight, -Math.cos(before.camera.yaw) * localRight);
  const leftDesired = desiredHeading(beforeA, -1), rightDesired = desiredHeading(beforeD, 1);
  expect(Math.abs(wrap(leftDesired - afterA.animal.orientation))).toBeLessThan(Math.abs(wrap(leftDesired - beforeA.animal.orientation)));
  expect(Math.abs(wrap(rightDesired - afterD.animal.orientation))).toBeLessThan(Math.abs(wrap(rightDesired - beforeD.animal.orientation)));
  expect(wrap(afterA.animal.orientation - beforeA.animal.orientation)).toBeLessThan(-.08);
  expect(wrap(afterD.animal.orientation - beforeD.animal.orientation)).toBeGreaterThan(.08);
  const beforeS = await start(12103), afterS = await hold("KeyS", 1300);
  expect(Math.hypot(afterS.animal.x - beforeS.animal.x, afterS.animal.z - beforeS.animal.z)).toBeGreaterThan(.08);
  const beforeHead = await start(12104);
  await page.keyboard.down("ArrowLeft"); await page.keyboard.down("ArrowUp"); await page.waitForTimeout(420); await page.keyboard.up("ArrowLeft"); await page.keyboard.up("ArrowUp"); await page.waitForTimeout(60);
  const afterHead = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  expect(afterHead.animal.headYaw).toBeGreaterThan(beforeHead.animal.headYaw + .2);
  expect(afterHead.animal.headPitch).toBeLessThan(beforeHead.animal.headPitch - .2);
  expect(Math.hypot(afterHead.animal.x - beforeHead.animal.x, afterHead.animal.z - beforeHead.animal.z)).toBeLessThan(.04);
  expect(Math.abs(afterHead.animal.orientation - beforeHead.animal.orientation)).toBeLessThan(.03);
});

test("keyboard action shortcuts work and survival objectives can auto-travel", async ({ page }) => {
  test.setTimeout(50_000); await page.goto("/?test=1"); await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 12201)); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState());
  await page.keyboard.press("KeyR"); await expect(page.locator("#hud-selected-action")).toContainText("resting under direct control");
  await page.waitForTimeout(1200); expect((await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState())).animal.objective).toBe("rest");
  await page.keyboard.press("Space"); await expect(page.locator("#hud-selected-action")).toContainText(/attack|unable to attack/);
  await page.keyboard.press("KeyM"); await expect(page.locator("#hud-selected-action")).toContainText(/courting|unable to begin courtship/);
  await page.keyboard.press("KeyG"); await expect(page.locator("#hud-selected-action")).toContainText(/forming a group|unable to form a group/);
  await page.keyboard.press("KeyL"); await expect(page.locator("#hud-selected-action")).toContainText(/leadership|forming a group|unable to form a group/);
  await page.keyboard.press("KeyJ"); await expect(page.locator("#hud-selected-action")).toContainText(/following|unable to follow/);
  for (let seed = 12202; seed < 12222; seed += 1) { await page.evaluate(value => window.rssDiagnostics.startEmbodied("hard", "herbivore", value, { speciesId: "grazer", sex: "M", lifeStage: "adult", condition: { thirst: 75, hunger: 20, health: 100, energy: 90, fatigue: 0, injuries: [] } }), seed); if ((await page.evaluate(() => window.rssDiagnostics.embodiedControlState().nearestWaterDistance)) < 7) break; } await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState()); const before = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  await page.keyboard.press("KeyF"); await expect(page.locator("#hud-selected-action")).toContainText(/water|drink|moisture|drainage|shoreline/); await page.waitForTimeout(2200); const after = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState()); expect(Math.hypot(after.animal.x - before.animal.x, after.animal.z - before.animal.z)).toBeGreaterThan(.02);
  await expect.poll(() => page.locator("#hud-selected-action").textContent(), { timeout: 30_000, intervals: [500] }).toMatch(/drinking in contact/);
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.embodiedGameplayState().animal.hydration), { timeout: 10_000, intervals: [500] }).toBeGreaterThan(before.animal.hydration);
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 12201, { speciesId: "grazer", sex: "M", lifeStage: "adult", condition: { thirst: 0, hunger: 90, health: 100, energy: 90, fatigue: 0, injuries: [] } })); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState()); const hungry = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  await page.keyboard.press("KeyF"); await expect.poll(() => page.locator("#hud-selected-action").textContent(), { timeout: 20_000, intervals: [500] }).toMatch(/graz|brows|forage|food/);
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.embodiedGameplayState().animal.stomach), { timeout: 12_000, intervals: [500] }).toBeGreaterThan(hungry.animal.stomach);
  await page.locator("#new-world-open").click(); await expect(page.locator("#new-world-panel")).toBeVisible(); await page.locator("#new-world-cancel").click();
});

test("attack and court actions approach their targets instead of changing labels only", async ({ page }) => {
  test.setTimeout(70_000); await page.goto("/?test=1"); await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  for (let seed = 12400; seed < 12480; seed += 1) { await page.evaluate(value => window.rssDiagnostics.startEmbodied("hard", "herbivore", value, { speciesId: "grazer", sex: "M", lifeStage: "adult" }), seed); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState()); if ((await page.evaluate(() => window.rssDiagnostics.embodiedControlState().nearestAnimal?.distance ?? Infinity)) < 8) break; }
  await page.keyboard.press("Space"); const attackStart = await page.evaluate(() => window.rssDiagnostics.embodiedControlState().objectiveTarget); expect(attackStart).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.embodiedControlState().objectiveTarget?.health ?? -1), { timeout: 30_000, intervals: [500] }).toBeLessThan(attackStart.health);
  for (let seed = 12500; seed < 12580; seed += 1) { await page.evaluate(value => window.rssDiagnostics.startEmbodied("hard", "herbivore", value, { speciesId: "grazer", sex: "M", lifeStage: "adult" }), seed); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState()); if ((await page.evaluate(() => window.rssDiagnostics.embodiedControlState().nearestMate?.distance ?? Infinity)) < 10) break; }
  await page.keyboard.press("KeyM"); await expect(page.locator("#hud-selected-action")).toContainText(/approaching|courting/);
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.embodiedGameplayState().animal.actionLabel), { timeout: 30_000, intervals: [500] }).toMatch(/courting|accepted|mating|rejected/);
});

test("embodied modes preserve population slots and expose their permitted interfaces", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => window.rssDiagnostics?.embodimentState);
  const observerPopulation = await page.evaluate(() => window.rssDiagnostics.embodimentState().population);
  const hard = await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 1337));
  expect(hard.population).toBe(observerPopulation);
  expect(hard.animal).toBeTruthy();
  const impossible = await page.evaluate(() => window.rssDiagnostics.startEmbodied("impossible-immersion", "carnivore", 1337));
  expect(impossible.population).toBe(observerPopulation);
  expect(impossible.capabilities.control).toBe("influence");
  await expect(page.locator("#embodied-runtime-panel")).toBeVisible();
  await expect(page.locator("#influence-runtime")).toBeVisible();
  await expect(page.locator("#lab-toggle")).toBeHidden();
});

test("all difficulties enforce information capabilities", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("extreme", "herbivore", 9201));
  await expect(page.locator("#observer-selection")).toBeHidden();
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("insane-immersion", "herbivore", 9202));
  await expect(page.locator("#observer-hud")).toBeHidden();
  await expect(page.locator("#embodied-sensory-focus")).toBeHidden();
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("impossible-immersion", "herbivore", 9203));
  await expect(page.locator("#observer-hud")).toBeHidden();
  await expect(page.locator("#influence-runtime")).toBeVisible();
  await expect(page.locator("#embodied-actions-toggle")).toBeHidden();
});

test("the floating minimap follows the difficulty ladder", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  for (const difficulty of ["creative", "easy", "standard", "challenging", "hard"]) {
    await page.evaluate((id) => window.rssDiagnostics.startEmbodied(id, "herbivore", 9300), difficulty);
    await expect(page.locator(".embodied-minimap-panel")).toBeVisible();
  }
  for (const difficulty of ["very-hard", "extreme", "insane-immersion", "impossible-immersion"]) {
    await page.evaluate((id) => window.rssDiagnostics.startEmbodied(id, "herbivore", 9301), difficulty);
    await expect(page.locator("#minimap")).toBeHidden();
  }
});

test("personal expressions and calls appear only after input and expire", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied);
  await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 9500));
  expect((await page.evaluate(() => window.rssDiagnostics.embodiedPresentationState())).animal.personalCalloutVisible).toBe(false);
  await page.locator("#embodied-actions-toggle").click();
  await page.locator('[data-player-selection="expression"]').selectOption("angry");
  await page.locator('[data-player-action="expression"]').click();
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.embodiedPresentationState().animal.personalExpressionVisible)).toBe(true);
  await page.waitForTimeout(2400);
  expect((await page.evaluate(() => window.rssDiagnostics.embodiedPresentationState())).animal.personalExpressionVisible).toBe(false);
  await page.locator('[data-player-action="vocalise"]').click();
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.embodiedPresentationState().animal.personalCalloutVisible)).toBe(true);
  await page.waitForTimeout(2000);
  expect((await page.evaluate(() => window.rssDiagnostics.embodiedPresentationState())).animal.personalCalloutVisible).toBe(false);
});

test("Q and E hold radial wheels select expressions and calls", async ({ page }, testInfo) => {
  await page.goto("/?test=1"); await page.waitForFunction(() => window.rssDiagnostics?.startEmbodied); await page.evaluate(() => window.rssDiagnostics.startEmbodied("hard", "herbivore", 9510)); await page.waitForFunction(() => window.rssDiagnostics.embodiedGameplayState());
  const before = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState());
  await page.keyboard.down("KeyQ"); await expect(page.locator("#embodied-radial-wheel")).toBeVisible(); await expect(page.locator("#embodied-radial-wheel")).toHaveAttribute("data-kind", "expression");
  await page.keyboard.down("KeyW"); await page.waitForTimeout(350); await page.keyboard.up("KeyW"); const suppressed = await page.evaluate(() => window.rssDiagnostics.embodiedGameplayState()); expect(Math.hypot(suppressed.animal.x - before.animal.x, suppressed.animal.z - before.animal.z)).toBeLessThan(.02);
  let box = await page.locator(".embodied-wheel-disc").boundingBox(); await page.mouse.move(box.x + box.width * .86, box.y + box.height * .5); await expect(page.locator(".embodied-wheel-item.is-selected small")).toHaveText("Fear"); await page.keyboard.up("KeyQ"); await expect(page.locator("#embodied-radial-wheel")).toBeHidden(); await expect(page.locator('[data-player-selection="expression"]')).toHaveValue("fear");
  await page.keyboard.down("KeyE"); await expect(page.locator("#embodied-radial-wheel")).toHaveAttribute("data-kind", "call"); box = await page.locator(".embodied-wheel-disc").boundingBox(); await page.mouse.move(box.x + box.width * .86, box.y + box.height * .5); await expect(page.locator(".embodied-wheel-item.is-selected small")).toHaveText("Care"); await page.screenshot({ path: testInfo.outputPath("call-wheel.png") }); await page.keyboard.up("KeyE"); await expect(page.locator('[data-player-selection="call"]')).toHaveValue("care"); await expect.poll(() => page.evaluate(() => window.rssDiagnostics.embodiedPresentationState().animal.personalCalloutVisible)).toBe(true);
});
