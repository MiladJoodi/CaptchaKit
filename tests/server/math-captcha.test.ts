import { afterEach, describe, expect, it } from "vitest";
import { generateMathChallenge } from "../../src/server/captcha/math";
import type { RandomSource } from "../../src/server/captcha/random";
import { createChallenge } from "../../src/server/createChallenge";
import { MemoryStore } from "../../src/server/security/memory";
import { setDefaultStore } from "../../src/server/security/defaultStore";
import { verifyCaptcha } from "../../src/server/verifyCaptcha";
import { toEnglishDigits, toPersianDigits } from "../../src/shared/digits";

const SECRET = "phase3-math-secret-key-32chars!!";

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

function evaluateDisplay(display: string): number {
  const normalized = toEnglishDigits(display)
    .replace("؟", "?")
    .replace(/\s*=\s*\?$/, "")
    .trim();

  const match = normalized.match(/^(\d+)\s*([+\-×÷])\s*(\d+)$/);
  if (!match) {
    throw new Error(`cannot parse math display: ${display}`);
  }
  const left = Number(match[1]);
  const op = match[2]!;
  const right = Number(match[3]);
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "×":
      return left * right;
    case "÷":
      return left / right;
    default:
      throw new Error(`unknown op ${op}`);
  }
}

describe("math CAPTCHA generation", () => {
  it("easy uses + or - with single-digit operands and non-negative results", () => {
    for (let i = 0; i < 30; i += 1) {
      const { answer, display } = generateMathChallenge("easy", "en");
      expect(display).toMatch(/^\d [+\-] \d = \?$/);
      const result = evaluateDisplay(display);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(String(result)).toBe(answer);
      expect(display.includes(answer) && display.endsWith(`= ${answer}`)).toBe(
        false,
      );
    }
  });

  it("medium uses +, -, or ×", () => {
    const ops = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const { display, answer } = generateMathChallenge("medium", "en");
      const op = display.split(" ")[1]!;
      ops.add(op);
      expect(["+", "-", "×"]).toContain(op);
      expect(String(evaluateDisplay(display))).toBe(answer);
    }
    expect(ops.has("+") || ops.has("-") || ops.has("×")).toBe(true);
  });

  it("hard supports integer division", () => {
    // op pick 3 => ÷, then right in [2,12], quotient in [2,12]
    const { answer, display } = generateMathChallenge(
      "hard",
      "en",
      sequenceRandom([3, 4, 6]),
    );
    expect(display).toBe("24 ÷ 4 = ?");
    expect(answer).toBe("6");
    expect(evaluateDisplay(display)).toBe(6);
    expect(Number.isInteger(evaluateDisplay(display))).toBe(true);
  });

  it("never embeds the answer in the display expression", () => {
    for (let i = 0; i < 20; i += 1) {
      const { answer, display } = generateMathChallenge("hard", "en");
      expect(display.endsWith("= ?")).toBe(true);
      expect(display.includes(`= ${answer}`)).toBe(false);
    }
  });

  it("renders Persian digits and ؟ for locale=fa", () => {
    const { answer, display } = generateMathChallenge(
      "easy",
      "fa",
      sequenceRandom([0, 3, 4]),
    );
    // op 0 => +, left 3, right 4
    expect(display).toBe(`${toPersianDigits("3")} + ${toPersianDigits("4")} = ؟`);
    expect(answer).toBe("7");
  });
});

describe("math CAPTCHA verification", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
    setDefaultStore(null);
  });

  it("verifies English math answers", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const expected = generateMathChallenge(
      "easy",
      "en",
      sequenceRandom([0, 5, 2]),
    );
    const challenge = await createChallenge({
      type: "math",
      difficulty: "easy",
      locale: "en",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 5, 2]),
    });

    expect(challenge.challenge.display).toBe(expected.display);
    const result = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store,
    });
    expect(result.success).toBe(true);
  });

  it("verifies Persian digit answers for fa locale", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const expected = generateMathChallenge(
      "easy",
      "fa",
      sequenceRandom([0, 5, 2]),
    );
    const challenge = await createChallenge({
      type: "math",
      difficulty: "easy",
      locale: "fa",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 5, 2]),
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: toPersianDigits(expected.answer),
      secret: SECRET,
      store,
    });
    expect(result.success).toBe(true);
  });

  it("rejects incorrect answers", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const challenge = await createChallenge({
      type: "math",
      difficulty: "easy",
      secret: SECRET,
      store,
      random: sequenceRandom([0, 5, 2]),
    });

    const result = await verifyCaptcha({
      token: challenge.token,
      answer: "999",
      secret: SECRET,
      store,
    });
    expect(result).toEqual({
      success: false,
      error: "CAPTCHA_INVALID_ANSWER",
    });
  });
});
