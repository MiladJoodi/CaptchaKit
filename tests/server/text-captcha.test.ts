import { afterEach, describe, expect, it } from "vitest";
import {
  assertNoAmbiguousChars,
  generateTextChallenge,
} from "../../src/server/captcha/text";
import type { RandomSource } from "../../src/server/captcha/random";
import { createChallenge } from "../../src/server/createChallenge";
import { MemoryStore } from "../../src/server/security/memory";
import { setDefaultStore } from "../../src/server/security/defaultStore";
import { verifyCaptcha } from "../../src/server/verifyCaptcha";
import { CHALLENGE_TTL_MS, MAX_ATTEMPTS } from "../../src/shared/server-constants";

const SECRET = "phase3-text-secret-key-32chars!!";

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

describe("text CAPTCHA generation", () => {
  it("generates correct lengths per difficulty", () => {
    expect(generateTextChallenge("easy", "en").answer).toHaveLength(4);
    expect(generateTextChallenge("medium", "en").answer).toHaveLength(5);
    expect(generateTextChallenge("hard", "en").answer).toHaveLength(6);
  });

  it("excludes ambiguous characters", () => {
    for (let i = 0; i < 40; i += 1) {
      const { answer, display } = generateTextChallenge("hard", "en");
      expect(assertNoAmbiguousChars(answer)).toBe(true);
      expect(assertNoAmbiguousChars(display)).toBe(true);
      expect(display).toBe(answer);
    }
  });

  it("uses only allowed characters for easy/medium (upper + digits)", () => {
    const { answer } = generateTextChallenge(
      "easy",
      "en",
      sequenceRandom([0, 1, 2, 3]),
    );
    expect(answer).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("hard difficulty can include lowercase", () => {
    // Alphabet is UPPER_DIGITS (32) + LOWER (23) = 55 chars.
    // Index 32 is first lowercase 'a'.
    const { answer } = generateTextChallenge(
      "hard",
      "en",
      sequenceRandom([32, 0, 1, 2, 3, 4]),
    );
    expect(answer).toMatch(/[a-z]/);
    expect(answer).toHaveLength(6);
  });
});

describe("text CAPTCHA workflow", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
    setDefaultStore(null);
  });

  it("creates a challenge without exposing the answer", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const known = generateTextChallenge(
      "easy",
      "en",
      sequenceRandom([0, 1, 2, 3]),
    );

    const challenge = await createChallenge({
      type: "text",
      difficulty: "easy",
      locale: "en",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    expect(challenge.type).toBe("text");
    expect(challenge.challenge.display).toBe(known.display);
    expect(challenge.token).toBeTruthy();
    expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    expect(challenge).not.toHaveProperty("answer");
    expect(Object.keys(challenge.challenge)).toEqual(["display"]);
  });

  it("verifies a correct answer and issues a proof", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const random = sequenceRandom([0, 1, 2, 3]);
    const expected = generateTextChallenge("easy", "en", sequenceRandom([0, 1, 2, 3]));

    const challenge = await createChallenge({
      type: "text",
      difficulty: "easy",
      secret: SECRET,
      store,
      random,
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeTruthy();
    }
  });

  it("accepts case-insensitive text answers", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const expected = generateTextChallenge(
      "hard",
      "en",
      sequenceRandom([0, 1, 2, 3, 4, 5]),
    );
    const challenge = await createChallenge({
      type: "text",
      difficulty: "hard",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3, 4, 5]),
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer.toLowerCase(),
      secret: SECRET,
      store,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a wrong answer", async () => {
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
      answer: "ZZZZ",
      secret: SECRET,
      store,
    });
    expect(result).toEqual({
      success: false,
      error: "CAPTCHA_INVALID_ANSWER",
    });
  });

  it("rejects an expired challenge", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const now = 1_000_000;
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
      now,
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store,
      now: now + CHALLENGE_TTL_MS + 1,
    });
    expect(result).toEqual({ success: false, error: "CAPTCHA_EXPIRED" });
  });

  it("rejects a consumed challenge", async () => {
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

    const first = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store,
    });
    expect(first.success).toBe(true);

    const second = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store,
    });
    expect(second).toEqual({
      success: false,
      error: "CAPTCHA_ALREADY_USED",
    });
  });

  it("enforces max attempts", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const challenge = await createChallenge({
      type: "text",
      difficulty: "easy",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      const result = await verifyCaptcha({
        token: challenge.token,
        answer: "WWWW",
        secret: SECRET,
        store,
      });
      expect(result).toEqual({
        success: false,
        error: "CAPTCHA_INVALID_ANSWER",
      });
    }

    const last = await verifyCaptcha({
      token: challenge.token,
      answer: "WWWW",
      secret: SECRET,
      store,
    });
    expect(last).toEqual({
      success: false,
      error: "CAPTCHA_MAX_ATTEMPTS",
    });
  });
});
