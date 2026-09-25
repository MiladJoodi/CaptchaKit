import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

function copyStyles(): void {
  const outDir = path.resolve("dist");
  mkdirSync(outDir, { recursive: true });
  copyFileSync(
    path.resolve("src/client/styles.css"),
    path.join(outDir, "styles.css"),
  );
}

/** Client-safe entries only. */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react/jsx-runtime", "react-dom"],
  outDir: "dist",
  onSuccess: async () => {
    copyStyles();
  },
});
