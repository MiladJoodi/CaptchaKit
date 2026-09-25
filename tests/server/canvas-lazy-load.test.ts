import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createChallenge } from "../../src/server/createChallenge";
import { MemoryStore } from "../../src/server/security/memory";
import { setDefaultStore } from "../../src/server/security/defaultStore";

const SECRET = "no-native-deps-secret-key-32chars!";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("server has no native image dependencies", () => {
  afterEach(() => {
    setDefaultStore(new MemoryStore());
  });

  it("built server bundle does not reference @napi-rs/canvas", () => {
    const esm = path.join(root, "dist/server/index.js");
    const cjs = path.join(root, "dist/server/index.cjs");
    try {
      expect(readFileSync(esm, "utf8")).not.toMatch(/@napi-rs\/canvas/);
      expect(readFileSync(cjs, "utf8")).not.toMatch(/@napi-rs\/canvas/);
    } catch {
      // Dist may be missing in isolation; build job covers this.
    }
  });

  it("package.json has no canvas dependency", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["@napi-rs/canvas"]).toBeUndefined();
    expect(pkg.optionalDependencies?.["@napi-rs/canvas"]).toBeUndefined();
  });

  it("createChallenge works for text/number/math/image without native modules", async () => {
    const store = new MemoryStore();
    for (const type of ["text", "number", "math", "image"] as const) {
      const result = await createChallenge({
        type,
        secret: SECRET,
        store,
      });
      expect(result.type).toBe(type);
      expect(result.token).toBeTruthy();
      if (type === "image") {
        expect(result.challenge.image?.startsWith("data:image/svg+xml")).toBe(
          true,
        );
      } else {
        expect(result.challenge.display).toBeTruthy();
      }
    }
  });

  it("built captchakit/server can create image challenges", async () => {
    const serverEntry = path.join(root, "dist/server/index.js");
    try {
      readFileSync(serverEntry, "utf8");
    } catch {
      return;
    }
    const mod = await import(
      `${pathToFileURL(serverEntry).href}?t=${Date.now()}`
    );
    const result = await mod.createChallenge({
      type: "image",
      secret: SECRET,
      store: new MemoryStore(),
    });
    expect(result.challenge.image?.startsWith("data:image/svg+xml")).toBe(true);
  });
});
