import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": rootDir } },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    environmentMatchGlobs: [["lib/ui/__tests__/**", "happy-dom"]],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.{ts,tsx}"],
      exclude: [
        "lib/**/__tests__/**",
        "lib/**/*.d.ts",
        "lib/ui/index.ts",
        "lib/ui/types.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
