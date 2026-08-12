import test from "node:test";
import assert from "node:assert/strict";
import { locationWithoutRequestedSaveSlot, requestedSaveSlot } from "../src/save-launch.js";

test("a shortcut save name is decoded from the query string", () => {
  assert.equal(requestedSaveSlot("?slot=01.08.26"), "01.08.26");
  assert.equal(requestedSaveSlot("?slot=SouthWest%20Family"), "SouthWest Family");
});

test("empty shortcut save names are ignored", () => {
  assert.equal(requestedSaveSlot(""), null);
  assert.equal(requestedSaveSlot("?slot=%20%20"), null);
});

test("the consumed shortcut parameter is removed without losing other launch state", () => {
  assert.equal(
    locationWithoutRequestedSaveSlot("http://localhost:8117/?slot=01.08.26&profile=cinema#view"),
    "/?profile=cinema#view"
  );
});
