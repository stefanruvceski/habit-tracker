import { describe, expect, it } from "vitest";
import { parseAuthLink } from "./authLink";

describe("parseAuthLink", () => {
  it("ignores unrelated or empty URLs", () => {
    expect(parseAuthLink(null)).toEqual({ kind: "none" });
    expect(parseAuthLink("https://example.com/auth?access_token=x")).toEqual({ kind: "none" });
    expect(parseAuthLink("streakli://other")).toEqual({ kind: "none" });
  });

  it("extracts tokens from the query", () => {
    expect(
      parseAuthLink("streakli://auth?access_token=aaa&refresh_token=rrr&type=magiclink"),
    ).toEqual({ kind: "session", accessToken: "aaa", refreshToken: "rrr" });
  });

  it("extracts tokens from the hash too", () => {
    expect(parseAuthLink("streakli://auth#access_token=a&refresh_token=r")).toEqual({
      kind: "session",
      accessToken: "a",
      refreshToken: "r",
    });
  });

  it("reports errors from an expired link", () => {
    expect(
      parseAuthLink("streakli://auth?error=access_denied&error_description=Email+link+is+invalid+or+has+expired"),
    ).toEqual({ kind: "error", message: "Email link is invalid or has expired" });
  });

  it("needs both tokens", () => {
    expect(parseAuthLink("streakli://auth?access_token=a")).toEqual({ kind: "none" });
  });
});
