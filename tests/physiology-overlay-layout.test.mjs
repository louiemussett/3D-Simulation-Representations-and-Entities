import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { physiologyOverlayStackLayout } from "../src/physiology-overlay-layout.js";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("performance and metabolic reserves share one painted seam", () => {
  const layout = physiologyOverlayStackLayout({
    stackBottomY: 3,
    performanceVisible: true,
    performanceHeight: 1,
    reservesVisible: true,
    reservesHeight: .8,
    seamOverlap: .04
  });

  assert.equal(layout.performanceY, 3.5);
  assert.equal(layout.reservesY, 4.36);
  assert.ok(Math.abs(layout.performanceY + .5 - (layout.reservesY - .4) - .04) < 1e-9);
  assert.equal(layout.stackTopY, 4.76);
});

test("edge-to-edge mode keeps complete card rectangles touching without overlap", () => {
  const layout = physiologyOverlayStackLayout({
    stackBottomY: 3,
    performanceVisible: true,
    performanceHeight: 1,
    reservesVisible: true,
    reservesHeight: .8,
    seamOverlap: 0
  });

  const performanceTop = layout.performanceY + .5;
  const reservesBottom = layout.reservesY - .4;
  assert.equal(performanceTop, reservesBottom);
  assert.equal(layout.seamOverlap, 0);
});

test("camera-facing parent cancellation preserves the stack plane at arbitrary pitch and roll", () => {
  const camera = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.18, .73, .16, "YXZ"));
  for (const parentEuler of [
    new THREE.Euler(0, 0, 0, "YXZ"),
    new THREE.Euler(.21, 2.4, -.17, "YXZ"),
    new THREE.Euler(-.33, -1.7, .24, "YXZ")
  ]) {
    const parent = new THREE.Quaternion().setFromEuler(parentEuler);
    const local = parent.clone().invert().multiply(camera);
    const resultingWorldPlane = parent.clone().multiply(local);
    assert.ok(resultingWorldPlane.angleTo(camera) < 1e-7);
  }
});

test("either physiology half can remain independently visible without a vacant slot", () => {
  const performanceOnly = physiologyOverlayStackLayout({
    stackBottomY: 2,
    performanceVisible: true,
    performanceHeight: 1,
    reservesVisible: false,
    reservesHeight: .8,
    seamOverlap: .04
  });
  const reservesOnly = physiologyOverlayStackLayout({
    stackBottomY: 2,
    performanceVisible: false,
    performanceHeight: 1,
    reservesVisible: true,
    reservesHeight: .8,
    seamOverlap: .04
  });

  assert.deepEqual(
    { performanceY: performanceOnly.performanceY, reservesY: performanceOnly.reservesY, top: performanceOnly.stackTopY },
    { performanceY: 2.5, reservesY: null, top: 3 }
  );
  assert.deepEqual(
    { performanceY: reservesOnly.performanceY, reservesY: reservesOnly.reservesY, top: reservesOnly.stackTopY },
    { performanceY: null, reservesY: 2.4, top: 2.8 }
  );
  assert.equal(performanceOnly.seamOverlap, 0);
  assert.equal(reservesOnly.seamOverlap, 0);
});

test("an entirely hidden physiology stack preserves its anchor", () => {
  assert.deepEqual(
    physiologyOverlayStackLayout({ stackBottomY: 7, performanceHeight: 1, reservesHeight: .8, seamOverlap: .04 }),
    { performanceY: null, reservesY: null, stackBottomY: 7, stackTopY: 7, seamOverlap: 0 }
  );
});

test("world overlays use the shared stack while retaining separate settings controls", () => {
  assert.match(app, /physiologyOverlayStackLayout\(\{/);
  assert.match(app, /performanceVisible:\s*showEndurance/);
  assert.match(app, /reservesVisible:\s*showComposition/);
  assert.match(app, /camera-facing-physiology-stack/);
  assert.match(app, /physiologyOverlayScratch\.localQuaternion[\s\S]*multiply\(camera\.quaternion\)/);
  assert.match(app, /physiologyRoot\.add\(enduranceBar\)/);
  assert.match(app, /physiologyRoot\.add\(compositionBar\)/);
  assert.match(app, /seamOverlap:\s*0/);
  assert.match(html, /id="overlay-endurance-bar"[^>]*\/?>\s*Performance fuels/);
  assert.match(html, /id="overlay-composition-bar"[^>]*\/?>\s*Metabolic reserves/);
  assert.match(html, /attached upper half of one physiology stack/);
  assert.match(html, /independent Overlays checkbox still controls it separately/);
});
