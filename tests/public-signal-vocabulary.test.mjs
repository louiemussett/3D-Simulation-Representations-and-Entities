import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  completeSymbolLegendSections,
  emittedSymbol,
  publicSignalContract,
  PUBLIC_SIGNAL_CONTRACTS,
  PUBLIC_SIGNAL_VARIANTS,
  resolveSymbolPresentation,
  signalAllowed,
  signalVariant
} from "../src/symbol-registry.js";

const animal = (speciesId = "grazer", lifeStage = "adult", extra = {}) => ({ id: `${speciesId}-speaker`, speciesId, lifeStage, ...extra });
const record = (kind, extra = {}) => ({ kind, sourceId: "speaker", x: 4, z: 7, urgency: 60, ...extra });

test("authoritative signal fields select visibly distinct callouts without consulting predictions", () => {
  assert.equal(signalVariant(animal("grazer", "dependent"), "contact"), "dependent-contact");
  assert.equal(signalVariant(animal("grazer", "juvenile"), "contact"), "juvenile-contact");
  assert.equal(signalVariant(animal("grazer", "adult"), "contact"), "adult-herd-contact");
  assert.equal(signalVariant(animal("hunter", "adult"), "contact"), "adult-pack-contact");

  const generalThreat = animal("grazer", "adult", { socialSignal: record("threat") });
  const urgentThreat = animal("grazer", "adult", { socialSignal: record("threat", { urgency: 91 }) });
  const directWarning = animal("grazer", "adult", { socialSignal: record("threat", { targetId: "intruder-1" }) });
  const inferredTarget = animal("grazer", "adult", { socialSignal: record("threat", { inferredTargetId: "grazer-speaker", predatorId: "hunter-1" }) });
  assert.equal(emittedSymbol(generalThreat, "threat").id, "threat");
  assert.equal(emittedSymbol(urgentThreat, "threat").id, "alarm");
  assert.equal(emittedSymbol(directWarning, "threat").id, "direct-threat-warning");
  assert.equal(emittedSymbol(inferredTarget, "threat").id, "threat", "a private target inference is not translated into a directed public warning");

  const waterNeed = animal("grazer", "adult", { socialSignal: record("water") });
  const waterReport = animal("grazer", "adult", { socialSignal: record("water", { sharesLocation: true }) });
  assert.equal(emittedSymbol(waterNeed, "water").id, "water");
  assert.equal(emittedSymbol(waterReport, "water").id, "water-report");
  assert.notEqual(emittedSymbol(waterNeed, "water").glyph, emittedSymbol(waterReport, "water").glyph);
});

test("actively vocal status signals are described as calls rather than passive displays", () => {
  for (const kind of ["care", "injury", "water", "hunger", "heat", "cold"]) {
    const speaker = animal("grazer", kind === "care" ? "dependent" : "adult", { caregiverVisible: true });
    const presentation = resolveSymbolPresentation({ animal: speaker, channel: "public-signal", kind, vocal: true });
    assert.equal(presentation.modifiers.vocal, true, kind);
    assert.match(presentation.explanation, /vocalising/i, kind);
  }
});

test("reusable report and directive contracts require an explicit public evidence record", () => {
  const privateOnly = animal("grazer", "adult", {
    predictiveCognition: { ledger: [{ framework: "hazard", output: { probability: 0.92 } }] },
    forecastLedger: [{ target: "water", confidence: 0.95 }],
    memories: [{ type: "water", x: 4, z: 7, confidence: 0.9 }]
  });
  for (const kind of ["water-report", "food-report", "shelter-report", "route-blocked", "follow-me", "stop", "rally", "all-clear"]) {
    assert.equal(signalAllowed(privateOnly, kind), false, `${kind} must not be inferred from private state`);
  }
  assert.equal(emittedSymbol(privateOnly, "water").id, "water");

  const valid = {
    "water-report": record("water-report", { sharesLocation: true }),
    "food-report": record("food-report", { sharesLocation: true }),
    "shelter-report": record("shelter-report", { sharesLocation: true }),
    "route-blocked": record("route-blocked", { routeBlocked: true }),
    "follow-me": record("follow-me", { leaderId: "grazer-speaker" }),
    stop: record("stop", { leaderId: "grazer-speaker" }),
    rally: record("rally", { targetId: "rendezvous-1" }),
    "all-clear": record("all-clear", { clearedThreat: true, observedAtTick: 42 })
  };
  for (const [kind, signal] of Object.entries(valid)) assert.equal(signalAllowed(animal(), kind, signal), true, kind);
  assert.equal(signalAllowed(animal(), "water-report", { ...valid["water-report"], z: undefined }), false);
  assert.equal(signalAllowed(animal(), "all-clear", { ...valid["all-clear"], observedAtTick: undefined }), false);
});

test("new callout contracts have accessible labels, explicit epistemic limits and unique visual meanings", () => {
  assert.ok(Object.keys(PUBLIC_SIGNAL_CONTRACTS).length >= 20);
  for (const contract of Object.values(PUBLIC_SIGNAL_CONTRACTS)) {
    assert.ok(Object.isFrozen(contract));
    assert.ok(Object.isFrozen(contract.requiredEvidence));
    assert.ok(contract.label.length >= 5);
    assert.ok(contract.description.length >= 12);
    assert.match(contract.privacyBoundary, /never a private prediction/i);
  }
  assert.equal(publicSignalContract("unknown"), null);

  const examples = [
    emittedSymbol(animal(), "water-report", record("water-report", { sharesLocation: true })),
    emittedSymbol(animal(), "food-report", record("food-report", { sharesLocation: true })),
    emittedSymbol(animal(), "shelter-report", record("shelter-report", { sharesLocation: true })),
    emittedSymbol(animal(), "route-blocked", record("route-blocked", { routeBlocked: true })),
    emittedSymbol(animal(), "follow-me", record("follow-me", { leaderId: "grazer-speaker" })),
    emittedSymbol(animal(), "stop", record("stop", { leaderId: "grazer-speaker" })),
    emittedSymbol(animal(), "rally", record("rally", { targetId: "target" })),
    emittedSymbol(animal(), "all-clear", record("all-clear", { clearedThreat: true, observedAtTick: 3 }))
  ];
  assert.equal(new Set(examples.map(item => item.glyph)).size, examples.length);
  assert.equal(new Set(examples.map(item => item.label)).size, examples.length);
});

test("the frozen concrete-variant catalogue is exhaustive and reference-ready", () => {
  assert.ok(Object.isFrozen(PUBLIC_SIGNAL_VARIANTS));
  assert.ok(PUBLIC_SIGNAL_VARIANTS.length >= 28);
  assert.equal(new Set(PUBLIC_SIGNAL_VARIANTS.map(item => item.id)).size, PUBLIC_SIGNAL_VARIANTS.length);
  for (const variant of PUBLIC_SIGNAL_VARIANTS) {
    assert.ok(Object.isFrozen(variant));
    assert.ok(variant.id && variant.glyph && variant.label && variant.intent && variant.contract);
    assert.ok(publicSignalContract(variant.contract), variant.id);
    assert.equal(typeof variant.vocal, "boolean");
  }
});

test("semantic callout verbs tell Cinema whether the speaker warns, reports, directs or reassures", () => {
  const presentation = (kind, signal) => resolveSymbolPresentation({ animal: animal(), channel: "public-signal", symbol: emittedSymbol(animal(), kind, signal), vocal: true });
  assert.equal(presentation("threat", record("threat")).grammar.verb, "WARNS");
  assert.equal(presentation("water-report", record("water-report", { sharesLocation: true })).grammar.verb, "REPORTS");
  assert.equal(presentation("follow-me", record("follow-me", { leaderId: "grazer-speaker" })).grammar.verb, "DIRECTS");
  assert.equal(presentation("all-clear", record("all-clear", { clearedThreat: true, observedAtTick: 2 })).grammar.verb, "REASSURES");
  assert.equal(presentation("attacked", record("attacked")).grammar.verb, "ALERTS");
});

test("age and role constraints prevent implausible public directives", () => {
  const follow = record("follow-me", { leaderId: "speaker" });
  assert.equal(signalAllowed(animal("grazer", "juvenile"), "follow-me", follow), false);
  assert.equal(signalAllowed(animal("grazer", "adult"), "follow-me", follow), true);
  const food = record("food-report", { sharesLocation: true });
  assert.equal(signalAllowed(animal("grazer", "dependent"), "food-report", food), false);
  assert.equal(signalAllowed(animal("grazer", "juvenile"), "food-report", food), true);
});

test("the exhaustive legend includes actual and guarded callout variants", () => {
  const publicEntries = completeSymbolLegendSections()[0].entries;
  for (const label of ["dependent contact call", "urgent danger alarm", "direct warning to another animal", "reported water direction", "reported plant-food direction", "reported prey direction", "route-blocked warning", "follow-me direction", "all-clear signal"]) {
    assert.ok(publicEntries.some(entry => entry.label.includes(label)), label);
  }
});

test("runtime display resolves the exact active public record and admits the produced record explicitly", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /function socialSignalLabel\(kind, animal = \{\}, signal = animal\.socialSignal\).*emittedSymbol\(animal, kind, signal\)/);
  assert.match(source, /function socialSignalIcon\(kind, animal = \{\}, signal = animal\.socialSignal\).*emittedSymbol\(animal, kind, signal\)/);
  assert.match(source, /signalAllowed\(a, next\.kind, next\)/, "admission must validate the newly produced public record, not private animal state");
  assert.match(source, /water-report[\s\S]{0,220}does not confirm that water remains there/i);
  assert.match(source, /alarm[\s\S]{0,220}not proof of a predator's exact location or intent/i);
  assert.match(source, /all-clear[\s\S]{0,220}not proof of global safety/i);
});
