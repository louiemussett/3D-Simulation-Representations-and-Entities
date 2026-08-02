import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activeEmittedSignal, decisionTraceVisible, EXPRESSION_PRECEDENCE, FACIAL_EXPRESSION_LEGEND, facialExpressionSymbol, visibleBodyCondition, visibleExpression } from "../src/visual-language.js";

test("facial expression precedence uses visible conditions only", () => {
  assert.deepEqual(EXPRESSION_PRECEDENCE, [
    "dangerous-temperature", "panic", "fear", "severe-pain", "pain", "collapse", "aggression", "startle",
    "temperature", "strain", "distress", "fatigue", "affiliation", "focus", "attention", "recovery", "calm"
  ]);
  assert.equal(visibleExpression({ thermalStatus: "dangerously-cold", fear: 99, health: 10 }).key, "cold");
  assert.equal(visibleExpression({ fear: 90, health: 10 }).key, "panic");
  assert.equal(visibleExpression({ fear: 80, health: 10 }).key, "fear");
  assert.equal(visibleExpression({ health: 30, actionState: { key: "collapse" }, aggression: 1 }).key, "dizzy");
  assert.equal(visibleExpression({ health: 55, actionState: { key: "attack" }, aggression: 1 }).key, "pain");
  assert.equal(visibleExpression({ health: 100, actionState: { key: "collapse" }, aggression: 1 }).key, "exhausted");
  assert.equal(visibleExpression({ health: 100, actionState: { key: "attack" }, aggression: .9 }).key, "angry");
  assert.equal(visibleExpression({ health: 100, actionState: { key: "freeze" }, thermalStatus: "hot" }).key, "startled");
  assert.equal(visibleExpression({ health: 100, thermalStatus: "hot", actionState: { key: "birth" } }).key, "hot");
  assert.equal(visibleExpression({ health: 100, fatigue: 90, actionState: { key: "courtship" } }).key, "sleepy");
});

test("private needs, predictions, memories, and reproductive state do not select a face", () => {
  const animal = {
    health: 100, energy: 0, hydration: 0, stomach: 0, pregnant: { age: 10 }, drive: "reproduction", courtshipIconUntil: 999,
    commitmentState: { priority: "water" }, predictionLedger: [{ target: "predator-presence", confidence: 1 }],
    threatAssessment: { probability: 1 }, memories: [{ kind: "predator" }]
  };
  assert.equal(visibleExpression(animal).key, "calm");
});

test("every visible facial expression has an explained legend symbol", () => {
  const expected = [
    "calm", "alert", "focused", "affiliative", "worried", "startled", "fear", "panic", "pain", "dizzy",
    "angry", "strained", "exhausted", "hot", "cold", "weary", "sleepy", "relaxed"
  ];
  assert.deepEqual(FACIAL_EXPRESSION_LEGEND.map((entry) => entry.key), expected);
  assert.equal(new Set(FACIAL_EXPRESSION_LEGEND.map((entry) => entry.key)).size, expected.length);
  for (const key of expected) {
    const entry = facialExpressionSymbol(key);
    assert.ok(entry.glyph);
    assert.match(entry.label, /—/);
    assert.match(entry.colour, /^#[0-9a-f]{6}$/i);
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(visibleExpression({ showcaseExpression: key }).key, key);
    assert.equal(visibleExpression({ showcaseExpression: key }).role, "showcase");
  }
  assert.equal(Object.isFrozen(FACIAL_EXPRESSION_LEGEND), true);
  assert.equal(facialExpressionSymbol("unknown").key, "calm");
});

test("every catalogue expression has dedicated world-panel artwork", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const renderer = source.slice(source.indexOf("function emotionFaceCanvas"), source.indexOf("function healthTier"));
  for (const { key } of FACIAL_EXPRESSION_LEGEND) {
    if (key === "calm") continue; // Calm is the deliberate default rendering branch.
    assert.match(renderer, new RegExp(`state === [\\"']${key}[\\"']`), `${key} needs distinct artwork`);
  }
});

test("observable actions and emitted calls produce the expanded expression range", () => {
  const cases = [
    [{ fear: 95 }, "panic", "panic"],
    [{ fear: 75 }, "fear", "fear"],
    [{ health: 20 }, "dizzy", "severe-pain"],
    [{ injuries: [{}] }, "pain", "pain"],
    [{ actionState: { key: "collapse" } }, "exhausted", "collapse"],
    [{ actionState: { key: "reject" } }, "angry", "aggression"],
    [{ actionState: { key: "freeze" } }, "startled", "startle"],
    [{ socialSignal: { kind: "threat" } }, "startled", "startle"],
    [{ thermalStatus: "hot" }, "hot", "temperature"],
    [{ thermalStatus: "cold" }, "cold", "temperature"],
    [{ socialSignal: { kind: "heat" } }, "hot", "temperature"],
    [{ socialSignal: { kind: "cold" } }, "cold", "temperature"],
    [{ actionState: { key: "birth" } }, "strained", "strain"],
    [{ actionState: { key: "chase" }, fatigue: 50 }, "strained", "strain"],
    [{ actionState: { key: "blocked" } }, "worried", "distress"],
    [{ socialSignal: { kind: "wait-up" } }, "worried", "distress"],
    [{ socialSignal: { kind: "hunger" } }, "worried", "distress"],
    [{ actionState: { key: "sleep" } }, "sleepy", "fatigue"],
    [{ fatigue: 90 }, "sleepy", "fatigue"],
    [{ actionState: { key: "recover-after-flight" } }, "weary", "fatigue"],
    [{ fatigue: 60 }, "weary", "fatigue"],
    [{ actionState: { key: "allow-nursing" } }, "affiliative", "affiliation"],
    [{ socialSignal: { kind: "courtship" } }, "affiliative", "affiliation"],
    [{ actionState: { key: "stalk" } }, "focused", "focus"],
    [{ actionState: { key: "listen" } }, "alert", "attention"],
    [{ socialSignal: { kind: "contact" } }, "alert", "attention"],
    [{ actionState: { key: "rest" } }, "relaxed", "recovery"]
  ];
  for (const [animal, key, role] of cases) {
    const result = visibleExpression({ health: 100, thermalStatus: "comfortable", ...animal });
    assert.equal(result.key, key, JSON.stringify(animal));
    assert.equal(result.role, role, JSON.stringify(animal));
    assert.equal(Object.isFrozen(result), true);
  }
});

test("visible expressions expose an observable timing cause without changing their semantic face key", () => {
  const cases = [
    [{}, "calm", "calm:fallback"],
    [{ actionState: { key: "wake" } }, "alert", "alert:sudden-orientation"],
    [{ actionState: { key: "search" } }, "alert", "alert:sustained-attention"],
    [{ actionState: { key: "evaluate-prey" } }, "focused", "focused:assessment"],
    [{ actionState: { key: "guard" } }, "focused", "focused:sustained-task"],
    [{ socialSignal: { kind: "courtship" } }, "affiliative", "affiliative:courtship-signal"],
    [{ actionState: { key: "courtship" } }, "affiliative", "affiliative:courtship"],
    [{ actionState: { key: "nurse" } }, "affiliative", "affiliative:sustained-care"],
    [{ socialSignal: { kind: "lost" } }, "worried", "worried:public-distress-signal"],
    [{ actionState: { key: "blocked" } }, "worried", "worried:acute-social-action"],
    [{ actionState: { key: "leave-group" } }, "worried", "worried:separation-or-abandonment"],
    [{ actionState: { key: "freeze" } }, "startled", "startled:acute"],
    [{ fear: 70 }, "fear", "fear:fear-level"],
    [{ fear: 90 }, "panic", "panic:extreme-fear"],
    [{ fear: 65, actionState: { key: "flee" } }, "panic", "panic:flight"],
    [{ health: 60 }, "pain", "pain:health"],
    [{ injuries: [{}] }, "pain", "pain:injury"],
    [{ health: 30 }, "dizzy", "dizzy:critical-health"],
    [{ injuries: [{}, {}] }, "dizzy", "dizzy:multiple-injuries"],
    [{ actionState: { key: "reject" } }, "angry", "angry:rejection"],
    [{ actionState: { key: "attack" }, aggression: .8 }, "angry", "angry:aggressive-action"],
    [{ actionState: { key: "birth" } }, "strained", "strained:birth"],
    [{ actionState: { key: "chase" }, fatigue: 50 }, "strained", "strained:intense-exertion"],
    [{ actionState: { key: "collapse" } }, "exhausted", "exhausted:collapse"],
    [{ thermalStatus: "dangerously-hot" }, "hot", "hot:dangerous-temperature"],
    [{ thermalStatus: "hot" }, "hot", "hot:ordinary-temperature"],
    [{ socialSignal: { kind: "heat" } }, "hot", "hot:public-heat-signal"],
    [{ thermalStatus: "dangerously-cold" }, "cold", "cold:dangerous-temperature"],
    [{ thermalStatus: "cold" }, "cold", "cold:ordinary-temperature"],
    [{ socialSignal: { kind: "cold" } }, "cold", "cold:public-cold-signal"],
    [{ actionState: { key: "active-recovery" } }, "weary", "weary:recovery-action"],
    [{ fatigue: 60 }, "weary", "weary:fatigue"],
    [{ actionState: { key: "sleep" } }, "sleepy", "sleepy:sleep-action"],
    [{ fatigue: 90 }, "sleepy", "sleepy:extreme-fatigue"],
    [{ actionState: { key: "rest" } }, "relaxed", "relaxed:safe-rest"],
    [{ actionState: { key: "warm" } }, "relaxed", "relaxed:temperature-recovery"]
  ];
  for (const [animal, expectedKey, expectedTimingKey] of cases) {
    const result = visibleExpression({ health: 100, thermalStatus: "comfortable", ...animal });
    assert.equal(result.key, expectedKey, JSON.stringify(animal));
    assert.equal(result.timingKey, expectedTimingKey, JSON.stringify(animal));
  }
});

test("expression categories cover their complete authoritative action families", () => {
  const families = [
    [["attack", "defend", "dominance", "social-attack", "spar", "caregiver-dispute"], { aggression: .9 }, "angry"],
    [["blocked", "submit", "yield-carcass", "abandon-hunt", "abandon-dependent", "leave-group"], {}, "worried"],
    [["active-recovery", "recover-after-combat", "recover-after-flight", "recover-after-travel"], {}, "weary"],
    [["courtship", "accept-mate", "mating", "nurse", "allow-nursing", "attend-birth"], {}, "affiliative"],
    [["evaluate-prey", "stalk", "track-scent", "guard", "protect-offspring", "claim-kill", "assess-rival", "coordinate-group"], {}, "focused"],
    [["orient", "listen", "search", "wander", "wake", "orient-after-waking"], {}, "alert"],
    [["rest", "alert-rest", "cool", "warm"], {}, "relaxed"]
  ];
  for (const [actions, extra, expected] of families) {
    for (const key of actions) assert.equal(visibleExpression({ health: 100, actionState: { key }, ...extra }).key, expected, key);
  }
});

test("body condition and emitted signals expose only coarse current cues", () => {
  assert.equal(visibleBodyCondition({ bodyCondition: .62 }).key, "emaciated");
  assert.equal(visibleBodyCondition({ bodyCondition: .8 }).key, "lean");
  const animal = { socialSignal: { kind: "cold", until: 12 } };
  assert.equal(activeEmittedSignal(animal, 11)?.kind, "cold");
  assert.equal(activeEmittedSignal(animal, 12), null);
  assert.equal(visibleExpression({ health: 100, socialSignal: { kind: "threat", until: 12 } }, 11).key, "startled");
  assert.equal(visibleExpression({ health: 100, socialSignal: { kind: "threat", until: 12 } }, 12).key, "calm");
});

test("decision trace is laboratory diagnostic information only", () => {
  assert.equal(decisionTraceVisible("selected-self"), true);
  for (const mode of ["observable-other", "strategic"]) assert.equal(decisionTraceVisible(mode), false);
  assert.equal(decisionTraceVisible("laboratory"), true);
});
