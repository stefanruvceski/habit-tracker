import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PALETTE,
  EMOJI_SUGGESTIONS,
  newId,
  seedHabits,
} from "../src/defaults.ts";
import { CURRENT_VERSION } from "../src/types.ts";

test("palette and emoji suggestions are non-empty", () => {
  assert.ok(PALETTE.length >= 6);
  for (const c of PALETTE) assert.match(c, /^#[0-9a-f]{6}$/i);
  assert.ok(EMOJI_SUGGESTIONS.length > 0);
});

test("newId produces unique, prefixed ids", () => {
  const a = newId();
  const b = newId();
  assert.notEqual(a, b);
  assert.match(a, /^h_/);
});

test("seedHabits returns familiar habits with valid fields", () => {
  const seed = seedHabits();
  assert.ok(seed.length >= 8);
  const ids = new Set<string>();
  seed.forEach((h, i) => {
    assert.ok(h.name.length > 0);
    assert.ok(h.emoji.length > 0);
    assert.ok(typeof h.icon === "string");
    assert.match(h.color, /^#[0-9a-f]{6}$/i);
    assert.ok(h.type === "build" || h.type === "quit");
    assert.equal(h.schedule.type, "daily");
    assert.equal(h.archived, false);
    assert.equal(h.order, i); // ordered 0..n
    assert.equal(ids.has(h.id), false);
    ids.add(h.id);
  });
  // includes at least one quit-type habit
  assert.ok(seed.some((h) => h.type === "quit"));
});

test("CURRENT_VERSION is a positive integer", () => {
  assert.ok(Number.isInteger(CURRENT_VERSION) && CURRENT_VERSION >= 1);
});
