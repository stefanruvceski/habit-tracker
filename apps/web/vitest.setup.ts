import { afterEach, vi } from "vitest";
import { createElement } from "react";
import { cleanup } from "@testing-library/react";

// Next.js navigation is not mounted under jsdom — provide light mocks so client
// components that use the router / Link render in isolation.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: Record<string, unknown>) =>
    createElement(
      "a",
      { href: typeof href === "string" ? href : "#", ...props },
      children as never,
    ),
}));

// Default fetch stub so store FX auto-refresh never hits the network during
// tests. Individual tests override global.fetch as needed.
if (!globalThis.fetch || !("mock" in (globalThis.fetch as object))) {
  globalThis.fetch = vi.fn(async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  })) as unknown as typeof fetch;
}

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});
