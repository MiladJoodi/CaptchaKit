import { afterEach, describe, expect, it } from "vitest";
import { generateNumberChallenge } from "../../src/server/captcha/number";
import type { RandomSource } from "../../src/server/captcha/random";
import { createChallenge } from "../../src/server/createChallenge";
import { MemoryStore } from "../../src/server/security/memory";
import { setDefaultStore } from "../../src/server/security/defaultStore";
import { verifyCaptcha } from "../../src/server/verifyCaptcha";
import { toEnglishDigits, toPersianDigits } from "../../src/shared/digits";

const SECRET = "phase3-number-secret-key-32chars!";

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

describe("number CAPTCHA generation", () => {
  it("uses correct lengths for all difficulties", () => {
    expect(generateNumberChallenge("easy", "en").answer).toHaveLength(4);

    const medium = generateNumberChallenge(
      "medium",
      "en",
      sequenceRandom([5, 1, 2, 3, 4, 5]),
    );
    expect(medium.answer).toHaveLength(5);

    const medium6 = generateNumberChallenge(
      "medium",
      "en",
      sequenceRandom([6, 1, 2, 3, 4, 5, 6]),
    );
    expect(medium6.answer).toHaveLength(6);

    const hard = generateNumberChallenge(
      "hard",
      "en",
      sequenceRandom([7, 1, 2, 3, 4, 5, 6, 7]),
    );
    expect(hard.answer).toHaveLength(7);
  });

  it("displays English digits for locale=en", () => {
    const { answer, display } = generateNumberChallenge(
      "easy",
      "en",
      sequenceRandom([0, 1, 2, 3]),
    );
    expect(display).toBe(answer);
    expect(display).toMatch(/^[1-9][0-9]{3}$/);
  });

  it("displays Persian digits for locale=fa", () => {
    const { answer, display } = generateNumberChallenge(
      "easy",
      "fa",
      sequenceRandom([0, 1, 2, 3]),
    );
    expect(display).toBe(toPersianDigits(answer));
    expect(toEnglishDigits(display)).toBe(answer);
    expect(display).toMatch(/^[۱-۹][۰-۹]{3}$/);
  });
});

describe("number CAPTCHA verification", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
    setDefaultStore(null);
  });

  it("verifies English answers", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const expected = generateNumberChallenge(
      "easy",
      "en",
      sequenceRandom([0, 1, 2, 3]),
    );
    const challenge = await createChallenge({
      type: "number",
      difficulty: "easy",
      locale: "en",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store,
    });
    expect(result.success).toBe(true);
  });

  it("normalizes Persian digit answers", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const expected = generateNumberChallenge(
      "easy",
      "fa",
      sequenceRandom([0, 1, 2, 3]),
    );
    const challenge = await createChallenge({
      type: "number",
      difficulty: "easy",
      locale: "fa",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    expect(challenge.challenge.display).toBe(toPersianDigits(expected.answer));

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: toPersianDigits(expected.answer),
      secret: SECRET,
      store,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid answer", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const challenge = await createChallenge({
      type: "number",
      difficulty: "easy",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 1, 2, 3]),
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: "0000",
      secret: SECRET,
      store,
    });
    expect(result).toEqual({
      success: false,
      error: "CAPTCHA_INVALID_ANSWER",
    });
  });
});
