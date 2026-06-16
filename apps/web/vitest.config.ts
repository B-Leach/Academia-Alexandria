import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.ts"],
    exclude: ["__tests__/integration/**"],
    coverage: {
      provider: "v8",
      include: ["actions/**/*.ts", "lib/**/*.ts"],
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
