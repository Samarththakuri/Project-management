import { defineConfig } from "vitest/config";

/*
 * Deliberately separate from vite.config.js. The build config is what ships to
 * production and is left untouched; Vitest resolves this file first when both
 * exist, so test settings can never alter bundle output.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.js", "src/**/*.test.jsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/utils/**/*.js"],
    },
  },
});
