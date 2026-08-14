import { test } from "node:test";
import assert from "node:assert/strict";

import { initialsFromEmail } from "../src/user.ts";

test("initialsFromEmail: separators give first letter of each chunk", () => {
  assert.equal(initialsFromEmail("ana.petrovic@x.com"), "AP");
  assert.equal(initialsFromEmail("marko_kovac@x.com"), "MK");
  assert.equal(initialsFromEmail("jo-vana@x.com"), "JV");
});

test("initialsFromEmail: no separator uses the first two letters", () => {
  assert.equal(initialsFromEmail("stefanruvceski@gmail.com"), "ST");
  assert.equal(initialsFromEmail("a@x.com"), "A");
});

test("initialsFromEmail: empty / missing falls back to ?", () => {
  assert.equal(initialsFromEmail(""), "?");
  assert.equal(initialsFromEmail(null), "?");
  assert.equal(initialsFromEmail(undefined), "?");
});
