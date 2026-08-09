import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cinemaEntityPresentation, cinemaPresentationNeedsInstrument } from "../src/cinema-entity-presentation.js";

const subjects = [
  { id: "VG2", sex: "M", lifeStage: "adult", isLeader: true },
  { id: "VG18", sex: "F", lifeStage: "juvenile", isLeader: false }
];

test("a detailed named claim binds the full panel and highlight to the named animal", () => {
  const result = cinemaEntityPresentation({ text: "This juvenile Valley Grazer VG18 carries very high stress-recovery debt.", subjects, licensedSubjectIds: ["VG2", "VG18"], groupSize: 3 });
  assert.equal(result.subjectId, "VG18");
  assert.equal(result.depth, "full");
  assert.deepEqual(result.mentionedSubjectIds, ["VG18"]);
  assert.equal(cinemaPresentationNeedsInstrument(result), true);
});

test("several detailed channels request a Laboratory-depth presentation", () => {
  const result = cinemaEntityPresentation({ text: "VG18 has low reserves, remembers the alarm, and predicts danger nearby.", subjects, licensedSubjectIds: ["VG18"] });
  assert.equal(result.depth, "laboratory");
  assert.deepEqual([...result.domains].sort(), ["memory", "physiology", "prediction"].sort());
});

test("a name adds no value to a simple action shot and becomes role wording plus a ring", () => {
  const result = cinemaEntityPresentation({ text: "VG2 is searching for water.", subjects, licensedSubjectIds: ["VG2"], groupSize: 4 });
  assert.equal(result.depth, "ring");
  assert.equal(result.subjectId, "VG2");
  assert.equal(result.roleWorded, true);
  assert.equal(result.text, "The leader of this group is searching for water.");
  assert.equal(cinemaPresentationNeedsInstrument(result), false);
});

test("an unnamed licensed subject remains ring-only without inventing a name", () => {
  const result = cinemaEntityPresentation({ text: "The young animal is listening.", subjects, licensedSubjectIds: ["VG18"] });
  assert.equal(result.depth, "ring");
  assert.equal(result.subjectId, "VG18");
  assert.deepEqual(result.mentionedSubjectIds, []);
});

test("a named identity description uses the condensed panel", () => {
  const result = cinemaEntityPresentation({ text: "VG18, the juvenile female, remains with the group.", subjects, licensedSubjectIds: ["VG18"], groupSize: 3 });
  assert.equal(result.depth, "condensed");
  assert.equal(result.subjectId, "VG18");
});

test("Cinema binds narration highlights, panel depth, and spoken copy to one presentation contract", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /cinemaEntityPresentation\(\{ text: narration/);
  assert.match(source, /shot\?\.entityPresentation\?\.subjectId/);
  assert.match(source, /cinemaPresentationNeedsInstrument\(presentation\)/);
  assert.match(source, /speakMovieNarration\(presentedNarration/);
  assert.match(source, /ringAt\(narrated, bodyRadius\(narrated\) \* 1\.85, mats\.selected\)/);
});

test("Cinema never opens the large physiology instrument for an unavailable or unrelated channel", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const resolver = source.match(/function cinemaNarrationNeedsInstrument\(shot = movieState\.shot\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(resolver, /presentation\.domains\?\.includes\("physiology"\)/);
  assert.match(resolver, /movieChannelEnabled\("physiology"\)/);
  assert.match(resolver, /cinemaPresentationNeedsInstrument\(presentation\)/);
});
