import { describe, expect, it } from "vitest";
import { buildFromTag, pickLatest } from "./updates";

const apk = (n: number) => ({
  name: "streakli.apk",
  browser_download_url: `https://github.com/x/y/releases/download/android-b${n}/streakli.apk`,
});

describe("buildFromTag", () => {
  it("parses android build tags", () => {
    expect(buildFromTag("android-b12")).toBe(12);
    expect(buildFromTag("android-b0")).toBeNull();
    expect(buildFromTag("v1.2.0")).toBeNull();
    expect(buildFromTag("android-bx")).toBeNull();
  });
});

describe("pickLatest", () => {
  it("picks the highest build with an APK, skipping drafts and others", () => {
    const latest = pickLatest([
      { tag_name: "android-b3", assets: [apk(3)], body: "three" },
      { tag_name: "android-b9", draft: true, assets: [apk(9)] },
      { tag_name: "android-b7", assets: [apk(7)], body: " seven \n" },
      { tag_name: "android-b8", assets: [] },
      { tag_name: "web-v2", assets: [apk(99)] },
    ]);
    expect(latest?.build).toBe(7);
    expect(latest?.apkUrl).toContain("android-b7");
    expect(latest?.notes).toBe("seven");
  });

  it("returns null when there is nothing usable", () => {
    expect(pickLatest([])).toBeNull();
    expect(pickLatest([{ tag_name: "android-b2" }])).toBeNull();
  });
});
