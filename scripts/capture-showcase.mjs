import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", error => console.error(error));
await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await page.click("#menu-showcase-world");
await page.click('[data-showcase-scenario="overview"]');
await page.waitForTimeout(2500);

await page.evaluate(() => document.body.classList.add("cinematic-hud"));
await page.screenshot({ path: "assets/menu/showcase-selected.png" });

await page.evaluate(() => document.body.classList.add("screenshot-hide-selection"));
await page.screenshot({ path: "assets/menu/showcase-world.png" });

await page.evaluate(() => {
  for (const id of ["overlay-vision", "overlay-personal-space", "overlay-memory", "overlay-calls", "overlay-health-bars", "overlay-endurance-bar", "overlay-composition-bar", "overlay-knowledge-fog", "overlay-smell", "overlay-sound", "overlay-biomass", "overlay-water", "overlay-pheromone"]) {
    const control = document.getElementById(id); if (control) { control.checked = false; control.dispatchEvent(new Event("change", { bubbles: true })); }
  }
});
await page.waitForTimeout(400);
await page.screenshot({ path: "assets/menu/showcase-expressions.png" });
await browser.close();
