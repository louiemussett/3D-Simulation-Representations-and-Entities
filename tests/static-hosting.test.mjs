import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rootUrl = new URL("../", import.meta.url);

test("browser dependencies are publishable on localhost and static subpath hosts", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const [vendoredThree, installedThree, vendoredControls, installedControls] = await Promise.all([
    readFile(new URL("vendor/three/build/three.module.js", rootUrl)),
    readFile(new URL("node_modules/three/build/three.module.js", rootUrl)),
    readFile(new URL("vendor/three/examples/jsm/controls/OrbitControls.js", rootUrl)),
    readFile(new URL("node_modules/three/examples/jsm/controls/OrbitControls.js", rootUrl)),
  ]);
  const importMapSource = html.match(
    /<script\s+type=["']importmap["']>([\s\S]*?)<\/script>/i,
  )?.[1];

  assert.ok(importMapSource, "index.html must contain an import map");
  const imports = JSON.parse(importMapSource).imports;
  const digest = (value) => createHash("sha256").update(value).digest("hex");

  assert.equal(imports.three, "./vendor/three/build/three.module.js");
  assert.equal(imports["three/addons/"], "./vendor/three/examples/jsm/");
  assert.doesNotMatch(importMapSource, /(?:^|["'])\.?\/?node_modules\//);
  assert.equal(digest(vendoredThree), digest(installedThree), "vendored Three.js must match the installed pinned package");
  assert.equal(digest(vendoredControls), digest(installedControls), "vendored OrbitControls must match the installed pinned package");
  assert.match(html, /import\(["']\.\/src\/app\.js["']\)\.catch/);
  assert.match(html, /window\.__showStartupError\(error/);
});
