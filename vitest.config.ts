import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    globals: false,
  },
  resolve: {
    alias: {
      captchakit: path.resolve(__dirname, "src/index.ts"),
      "captchakit/server": path.resolve(__dirname, "src/server/index.ts"),
    },
  },
});
