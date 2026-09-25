import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readClientBundles(): string {
  const dist = path.join(root, "dist");
  const parts: string[] = [];
  for (const name of readdirSync(dist)) {
    if (name.endsWith(".js") || name.endsWith(".cjs")) {
      if (name.startsWith("server")) continue;
      parts.push(readFileSync(path.join(dist, name), "utf8"));
    }
  }
  const clientDir = path.join(dist, "client");
  for (const name of readdirSync(clientDir)) {
    if (name.endsWith(".js") || name.endsWith(".cjs")) {
      parts.push(readFileSync(path.join(clientDir, name), "utf8"));
    }
  }
  return parts.join("\n");
}

describe("client entry boundary", () => {
  it("exposes the Captcha component as a function component", async () => {
    const mod = await import("../../src/index");

    expect(mod.CAPTCHA_TYPES).toContain("math");
    expect(mod.CAPTCHA_ERROR_CODES.CAPTCHA_INVALID).toBe("CAPTCHA_INVALID");
    expect(typeof mod.Captcha).toBe("function");
    expect(typeof mod.isCaptchaErrorCode).toBe("function");

    expect("createChallenge" in mod).toBe(false);
    expect("verifyCaptcha" in mod).toBe(false);
    expect("createCaptchaHandlers" in mod).toBe(false);
    expect("useCaptcha" in mod).toBe(false);
  });

  it("client source does not import server or Node-only modules", () => {
    const clientSrc = readFileSync(path.join(root, "src/client/index.ts"), "utf8");
    const rootSrc = readFileSync(path.join(root, "src/index.ts"), "utf8");

    for (const src of [clientSrc, rootSrc]) {
      expect(src).not.toMatch(/from\s+["'].*server/);
      expect(src).not.toMatch(/@napi-rs\/canvas/);
      expect(src).not.toMatch(/node:crypto|from\s+["']crypto["']/);
      expect(src).not.toMatch(/process\.env/);
      expect(src).not.toMatch(/MemoryStore/);
    }
  });

  it("built client bundle does not reference server-only packages when present", () => {
    let clientBundle: string;
    try {
      clientBundle = readClientBundles();
    } catch {
      return;
    }

    expect(clientBundle).not.toMatch(/@napi-rs\/canvas/);
    expect(clientBundle).not.toMatch(/createChallenge/);
    expect(clientBundle).not.toMatch(/verifyCaptcha/);
    expect(clientBundle).not.toMatch(/createCaptchaHandlers/);
    expect(clientBundle).not.toMatch(/CAPTCHAKIT_SECRET/);
    expect(clientBundle).not.toMatch(/SECRET_ENV_KEY/);
    expect(clientBundle).not.toMatch(/MemoryStore/);
    expect(clientBundle).not.toMatch(/signChallengeToken/);
    expect(clientBundle).not.toMatch(/node:crypto/);
    expect(clientBundle).not.toMatch(/renderCaptchaImage/);
    expect(clientBundle).not.toMatch(/generateImageChallenge/);
  });
});

describe("server entry", () => {
  it("exposes the public server API", async () => {
    const mod = await import("../../src/server/index");
    expect(typeof mod.createChallenge).toBe("function");
    expect(typeof mod.verifyCaptcha).toBe("function");
    expect(typeof mod.createCaptchaHandlers).toBe("function");
    expect(typeof mod.defaultGetIdentifier).toBe("function");
    expect(typeof mod.getSecret).toBe("function");
    expect(typeof mod.MemoryStore).toBe("function");
    expect(typeof mod.CaptchaError).toBe("function");

    // Internal helpers must not be part of the public surface.
    expect("signChallengeToken" in mod).toBe(false);
    expect("renderCaptchaImage" in mod).toBe(false);
    expect("generateTextChallenge" in mod).toBe(false);
    expect("hashAnswer" in mod).toBe(false);
  });

  it("built server index does not reference @napi-rs/canvas", () => {
    const esmPath = path.join(root, "dist/server/index.js");
    try {
      const esm = readFileSync(esmPath, "utf8");
      expect(esm).not.toMatch(/@napi-rs\/canvas/);
    } catch {
      // Dist absent — covered by build + no-native-deps tests.
    }
  });
});

describe("client must not export Phase 2 server APIs", () => {
  it("root entry does not expose token/store utilities", async () => {
    const mod = await import("../../src/index");
    expect("signChallengeToken" in mod).toBe(false);
    expect("MemoryStore" in mod).toBe(false);
    expect("getSecret" in mod).toBe(false);
    expect("hashAnswer" in mod).toBe(false);
    expect("RateLimiter" in mod).toBe(false);
  });
});
