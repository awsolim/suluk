import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    testTimeout: 15000,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
