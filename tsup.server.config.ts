import { defineConfig } from "tsup";

/** Server entry — run after the client build (`clean: false`). */
export default defineConfig({
  entry: {
    "server/index": "src/server/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,
  treeshake: true,
  platform: "node",
  external: ["react", "react/jsx-runtime", "react-dom"],
  outDir: "dist",
});
