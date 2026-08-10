import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // Screens/components need the full React Native runtime (jest-expo); this
      // suite covers the platform-agnostic logic in src/lib.
      include: ["src/lib/**/*.ts"],
      reporter: ["text-summary", "text"],
    },
  },
});
