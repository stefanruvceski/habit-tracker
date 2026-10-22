import { expect, test } from "vitest";
import { consumeFocus, parseLogLink, requestFocus } from "./focusRequest";

test("parseLogLink reads the habit id from both schemes", () => {
  expect(parseLogLink("streakli://log/h_abc_1")).toBe("h_abc_1");
  expect(parseLogLink("streakli-dev://log/h%20x?x=1")).toBe("h x");
  expect(parseLogLink("streakli://auth?access_token=a")).toBeNull();
  expect(parseLogLink(null)).toBeNull();
});

test("a focus request is consumed once by the matching habit", () => {
  requestFocus("w");
  expect(consumeFocus("other")).toBe(false);
  expect(consumeFocus("w")).toBe(true);
  expect(consumeFocus("w")).toBe(false);
});
