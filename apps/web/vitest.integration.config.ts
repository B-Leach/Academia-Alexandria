import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./__tests__/integration/setup.ts"],
    include: ["__tests__/integration/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
    // Run integration tests sequentially — they share a database
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@academia-alexandria/shared": path.resolve(
        __dirname,
        "../../packages/shared/src"
      ),
      "@academia-alexandria/database": path.resolve(
        __dirname,
        "../../packages/database/src"
      ),
    },
  },
});
