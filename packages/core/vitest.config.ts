import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": `${rootDir}src` } },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/core/types.ts",
        "src/index.ts",
      ],
    },
  },
});
