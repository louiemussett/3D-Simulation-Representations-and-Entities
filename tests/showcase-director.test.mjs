import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("screenshot showcase exposes static, staged-live and autonomous modes", () => {
  for (const id of ["showcase-playback-mode", "showcase-map", "showcase-herbivore-count", "showcase-carnivore-count", "showcase-behaviour", "showcase-play-pause", "showcase-step", "showcase-jump-event"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
  }
  for (const mode of ["static", "live", "natural"]) assert.match(html, new RegExp(`value=["']${mode}["']`));
});

test("showcase director animates authored pursuit roles and can freeze them", () => {
  assert.match(app, /function advanceShowcaseDirector/);
  assert.match(app, /actor\.role === "flee"/);
  assert.match(app, /\["chase", "stalk", "evaluate-prey"\]\.includes\(actor\.role\)/);
  assert.match(app, /showcaseDirector\.playing = showcaseDirector\.mode !== "static"/);
  assert.match(app, /ui\.showcasePlayPause.*setShowcasePlayback/);
  assert.match(app, /ui\.showcaseStep.*tickWorld\(\).*advanceShowcaseDirector/s);
});

test("screenshot showcase keeps mountains and valleys at the low 0.20x profile", () => {
  assert.match(app, /const showcaseTerrainProfile = \{ mountains: \.2, valleys: \.2 \}/);
  assert.match(app, /\.\.\.mapPresets\[requested\.map\], \.\.\.showcaseTerrainProfile/);
});

test("cast and map controls feed deterministic scene construction", () => {
  for (const map of ["balanced", "grassland", "woodland", "waterside", "highland"]) assert.match(app, new RegExp(`${map}: \\{`));
  assert.match(app, /slice\(0, requested\.herbivores\)/);
  assert.match(app, /slice\(0, requested\.carnivores\)/);
  assert.match(app, /participants = \[\.\.\.grazers, \.\.\.hunters\]/);
});

test("family and reproductive scenes exclude predators while hunt scenes require them", () => {
  assert.match(app, /mating: \{ herbivores: 2, carnivores: 0, lockCarnivores: true \}/);
  assert.match(app, /"separated-young": \{ minimumHerbivores: 4, carnivores: 0, lockCarnivores: true \}/);
  assert.match(app, /birth: \{ minimumHerbivores: 4, carnivores: 0, lockCarnivores: true \}/);
  assert.match(app, /"pack-hunt": \{ minimumHerbivores: 4, minimumCarnivores: 2 \}/);
  assert.match(app, /hunter: requested\.carnivores \? Math\.max\(8, requested\.carnivores\) : 0/);
});

test("courtship showcase authors a reciprocal high-compatibility pair", () => {
  assert.match(app, /function authorShowcaseCourtshipMatch\(female, male, matingDuration = 12\)/);
  assert.match(app, /preferredMass: male\.bodyMass/);
  assert.match(app, /preferredAge: male\.age/);
  assert.match(app, /preferredAggression: male\.aggression/);
  assert.match(app, /preferredLibido: maleLibido/);
  assert.match(app, /female\.femaleMateGraph\[male\.id\] = \{ maleId: male\.id, alignment: 1/);
  assert.match(app, /authorShowcaseCourtshipMatch\(female, male, 12\)/);
  assert.match(app, /compatibility: 1/);
});

test("event jump stages deterministic screenshot moments including an immediate birth", () => {
  assert.match(app, /function jumpShowcaseToEvent\(\)/);
  assert.match(app, /giveBirth\(mother, species\[mother\.speciesId\]/);
  assert.match(app, /showcaseVisibleIds\?\.add\(child\.id\)/);
  const jumpBody = app.match(/function jumpShowcaseToEvent\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.ok(jumpBody, "jumpShowcaseToEvent body");
  assert.doesNotMatch(jumpBody, /Math\.random\(/);
});

test("birth showcase completes promptly and exposes world, elapsed and countdown time", () => {
  assert.match(html, /id=["']showcase-time["']/);
  assert.match(app, /const SHOWCASE_BIRTH_WAIT_SECONDS = 8/);
  assert.match(app, /World · \$\{formatEcologicalClock\(sim\)\}/);
  assert.match(app, /Scene · \$\{formatShowcaseElapsed\(showcaseDirector\.elapsed\)\}/);
  assert.match(app, /Birth in about \$\{Math\.max\(0, Math\.ceil\(SHOWCASE_BIRTH_WAIT_SECONDS - showcaseDirector\.elapsed\)\)\} s/);
  assert.match(app, /showcaseDirector\.elapsed >= SHOWCASE_BIRTH_WAIT_SECONDS/);
  assert.match(app, /stageShowcaseBirth\(\)/);
});
