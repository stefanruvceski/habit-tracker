import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HABIT_ICONS,
  HABIT_ICON_MAP,
  ICON_CATEGORIES,
  searchIcons,
} from "../src/icons.ts";

test("HABIT_ICONS is a non-empty set with unique ids and valid shape", () => {
  assert.ok(HABIT_ICONS.length > 20);
  const ids = new Set<string>();
  for (const icon of HABIT_ICONS) {
    assert.equal(typeof icon.id, "string");
    assert.ok(icon.id.length > 0);
    assert.ok(icon.label.length > 0);
    assert.ok(icon.e.length > 0); // has at least one primitive
    assert.equal(ids.has(icon.id), false, `duplicate id ${icon.id}`);
    ids.add(icon.id);
  }
});

test("every icon category label is used by at least... itself is a known list", () => {
  assert.ok(ICON_CATEGORIES.length > 0);
  const cats = new Set<string>(ICON_CATEGORIES as readonly string[]);
  for (const icon of HABIT_ICONS) {
    assert.ok(cats.has(icon.cat), `unknown category ${icon.cat}`);
  }
});

test("HABIT_ICON_MAP indexes every icon by id", () => {
  assert.equal(Object.keys(HABIT_ICON_MAP).length, HABIT_ICONS.length);
  const first = HABIT_ICONS[0];
  assert.equal(HABIT_ICON_MAP[first.id].id, first.id);
});

test("searchIcons: empty query returns everything", () => {
  assert.equal(searchIcons("").length, HABIT_ICONS.length);
  assert.equal(searchIcons("   ").length, HABIT_ICONS.length);
});

test("searchIcons: matches id, label, category and keywords", () => {
  const byLabel = searchIcons("gym");
  assert.ok(byLabel.some((i) => i.id === "dumbbell"));
  const byCat = searchIcons("Fitness");
  assert.ok(byCat.length > 0);
  const byKeyword = searchIcons("workout");
  assert.ok(byKeyword.some((i) => i.id === "dumbbell"));
});

test("searchIcons: no match returns empty", () => {
  assert.deepEqual(searchIcons("zzzznotarealicon"), []);
});
