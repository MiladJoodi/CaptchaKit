import { afterEach, describe, expect, it } from "vitest";
import { generateTextChallenge } from "../../src/server/captcha/text";
import type { RandomSource } from "../../src/server/captcha/random";
import { createChallenge } from "../../src/server/createChallenge";
import { CaptchaError } from "../../src/server/security/errors";
import { MemoryStore } from "../../src/server/security/memory";
import { setDefaultStore } from "../../src/server/security/defaultStore";
import { signProofToken } from "../../src/server/token/sign";
import { verifyCaptcha } from "../../src/server/verifyCaptcha";
import { RATE_LIMIT_MAX } from "../../src/shared/server-constants";

const SECRET = "phase3-workflow-secret-key-32ch!!";

function sequenceRandom(values: number[]): RandomSource {
  let index = 0;
  return {
    int(min, max) {
      if (index >= values.length) {
        throw new Error(`sequenceRandom exhausted at ${index}`);
      }
      const value = values[index++]!;
      if (value < min || value > max) {
        throw new Error(
          `sequence value ${value} out of range [${min}, ${max}] at ${index - 1}`,
        );
      }
      return value;
    },
  };
}

describe("challenge → proof workflow", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
    setDefaultStore(null);
  });

  it("challenge → answer → proof → consume proof once", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const expected = generateTextChallenge(
      "easy",
      "en",
      sequenceRandom([0, 1, 2, 3]),
    );
    const challenge = await createChallenge({
      type: "text",
      difficulty: "easy",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    const verified = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store,
    });
    expect(verified.success).toBe(true);
    if (!verified.success || !verified.token) {
      throw new Error("expected proof token");
    }

    const proofOk = await verifyCaptcha({
      token: verified.token,
      secret: SECRET,
      store,
    });
    expect(proofOk).toEqual({ success: true });

    const proofReuse = await verifyCaptcha({
      token: verified.token,
      secret: SECRET,
      store,
    });
    expect(proofReuse).toEqual({
      success: false,
      error: "CAPTCHA_ALREADY_USED",
    });
  });

  it("does not accept a challenge token as proof", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const challenge = await createChallenge({
      type: "text",
      difficulty: "easy",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      secret: SECRET,
      store,
    });
    expect(result).toEqual({ success: false, error: "CAPTCHA_INVALID" });
  });

  it("rejects an expired proof", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const now = 5_000_000;
    const { token, payload } = signProofToken({
      secret: SECRET,
      cjti: "cjti",
      now,
      ttlMs: 1000,
    });
    store.registerProof({ jti: payload.jti, expiresAt: payload.exp });

    const result = await verifyCaptcha({
      token,
      secret: SECRET,
      store,
      now: now + 1001,
    });
    expect(result).toEqual({ success: false, error: "CAPTCHA_EXPIRED" });
  });

  it("rejects a tampered token", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const challenge = await createChallenge({
      type: "text",
      difficulty: "easy",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    const [body] = challenge.token.split(".");
    const tampered = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const result = await verifyCaptcha({
      token: tampered,
      answer: "AAAA",
      secret: SECRET,
      store,
    });
    expect(result).toEqual({ success: false, error: "CAPTCHA_INVALID" });
  });

  it("rate limits challenge creation by identifier", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });

    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await createChallenge({
        type: "text",
        difficulty: "easy",
        secret: SECRET,
        store,
        identifier: "ip-1",
        random: sequenceRandom([0, 1, 2, 3]),
      });
    }

    await expect(
      createChallenge({
        type: "text",
        difficulty: "easy",
        secret: SECRET,
        store,
        identifier: "ip-1",
        random: sequenceRandom([0, 1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: "CAPTCHA_RATE_LIMITED",
    } satisfies Partial<CaptchaError>);
  });

  it("returns CAPTCHA_MISSING_SECRET when secret is absent", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const previous = process.env.CAPTCHAKIT_SECRET;
    delete process.env.CAPTCHAKIT_SECRET;
    try {
      const missing = await verifyCaptcha({
        token: "a.b",
        answer: "x",
        store,
      });
      expect(missing).toEqual({
        success: false,
        error: "CAPTCHA_MISSING_SECRET",
      });
    } finally {
      if (previous === undefined) {
        delete process.env.CAPTCHAKIT_SECRET;
      } else {
        process.env.CAPTCHAKIT_SECRET = previous;
      }
    }
  });

  it("rejects missing secret on createChallenge", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const previous = process.env.CAPTCHAKIT_SECRET;
    delete process.env.CAPTCHAKIT_SECRET;
    try {
      await expect(
        createChallenge({
          type: "text",
          store,
          random: sequenceRandom([0, 1, 2, 3]),
        }),
      ).rejects.toMatchObject({ code: "CAPTCHA_MISSING_SECRET" });
    } finally {
      if (previous === undefined) {
        delete process.env.CAPTCHAKIT_SECRET;
      } else {
        process.env.CAPTCHAKIT_SECRET = previous;
      }
    }
  });
});
