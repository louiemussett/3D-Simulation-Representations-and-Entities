import test from "node:test"; import assert from "node:assert/strict";
import { decayInfluence, influenceNeedScore, influenceSatisfierScore, normalizeInfluence } from "../src/internal-influence.js";
test("influence is bounded and decays toward neutral", () => { const a=normalizeInfluence({needBiases:{water:8},commitmentBias:-4}), b=decayInfluence(a,10,.01); assert.equal(a.needBiases.water,1); assert.ok(b.needBiases.water<a.needBiases.water); assert.ok(b.commitmentBias>a.commitmentBias); });
test("influence cannot make unknown or nonviable satisfiers selectable", () => { assert.equal(influenceSatisfierScore(1,"water",{satisfierBiases:{water:1}},false,true),-Infinity); assert.equal(influenceSatisfierScore(1,"water",{satisfierBiases:{water:1}},true,false),-Infinity); });
test("emergency need pressure retains a safety floor", () => { assert.ok(influenceNeedScore(.95,"water",{needBiases:{water:-1}})>=.82); });
