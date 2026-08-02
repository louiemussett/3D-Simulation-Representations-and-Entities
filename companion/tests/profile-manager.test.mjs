import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuthorProfileManager } from "../src/profile-manager.js";
import { AuthorLearningProfile } from "../../src/documentary-author-v3/learning.js";

test("companion stores immutable profile revisions and rolls the pointer back exactly", async () => { const root = await mkdtemp(join(tmpdir(), "documentary-profiles-")), manager = await new AuthorProfileManager(root).initialise(), first = new AuthorLearningProfile().snapshot(); await manager.commit("default", first); const profile = new AuthorLearningProfile(first); profile.lifecycle = "CALIBRATING"; profile.revision = 1; const second = profile.snapshot(); await manager.commit("default", second); const loaded = await manager.load("default"); assert.equal(loaded.snapshot.revision, 1); assert.deepEqual(loaded.manifest.revisions, [0, 1]); const rolled = await manager.rollback("default", 0); assert.equal(rolled.snapshot.profileChecksum, first.profileChecksum); const immutable = JSON.parse(await readFile(join(root, "default", "revisions", "00000001.json"), "utf8")); assert.equal(immutable.profileChecksum, second.profileChecksum); });

test("companion rejects a colliding immutable revision", async () => { const root = await mkdtemp(join(tmpdir(), "documentary-profile-collision-")), manager = await new AuthorProfileManager(root).initialise(), first = new AuthorLearningProfile().snapshot(); await manager.commit("default", first); await assert.rejects(manager.commit("default", { ...first, lifecycle: "CALIBRATING" }), /checksum|collision/); });
