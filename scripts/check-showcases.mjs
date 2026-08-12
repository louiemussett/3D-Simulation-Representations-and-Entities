import { chromium } from "@playwright/test";
const scenarios = ["overview", "mating", "chase", "pack-hunt", "separated-young", "birth", "demographics"];
const browser = await chromium.launch({ headless: true });
for (const scenario of scenarios) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.click("#menu-showcase-world"); await page.click(`[data-showcase-scenario="${scenario}"]`); await page.waitForTimeout(700);
  const state = await page.evaluate(() => ({ menuHidden: document.querySelector("#game-menu").hidden, showcaseVisible: !document.querySelector("#showcase-hud").hidden, ordinaryHudDisplay: getComputedStyle(document.querySelector("#observer-hud")).display, selectionDisplay: getComputedStyle(document.querySelector("#observer-selection")).display, startupError: document.querySelector("#startup-error")?.textContent || null }));
  if (errors.length || state.startupError || !state.menuHidden || !state.showcaseVisible || state.ordinaryHudDisplay !== "none" || state.selectionDisplay !== "none") throw new Error(`${scenario}: ${JSON.stringify({ errors, state })}`);
  console.log(`${scenario}: ok`); await page.close();
}
await browser.close();
