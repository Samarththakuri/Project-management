import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // setup.js sets env vars at module scope. That has to happen before the test
    // file imports app.js, because several modules read process.env at import time
    // (auth.controllers.js derives frontendBase and cookie flags on load).
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"],
    // First run downloads a MongoDB binary for mongodb-memory-server.
    testTimeout: 30000,
    hookTimeout: 120000,
    // Integration tests share one in-memory MongoDB and truncate between tests,
    // so they must not run concurrently in separate workers.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      // lcov is what SonarQube ingests; text keeps the CI log readable.
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.js"],
      exclude: [
        "src/index.js", // process bootstrap: starts a listener, not unit-testable
        "scripts/**",
      ],
    },
  },
});
