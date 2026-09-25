import { afterEach, describe, expect, it } from "vitest";
import {
  assertNoAmbiguousChars,
  generateTextChallenge,
} from "../../src/server/captcha/text";
import { generateImageChallenge } from "../../src/server/captcha/image";
import type { RandomSource } from "../../src/server/captcha/random";
import {
  CAPTCHA_IMAGE_HEIGHT,
  CAPTCHA_IMAGE_WIDTH,
  renderCaptchaImage,
  svgToDataUrl,
} from "../../src/server/image/render";
import { createChallenge } from "../../src/server/createChallenge";
import { MemoryStore } from "../../src/server/security/memory";
import { setDefaultStore } from "../../src/server/security/defaultStore";
import { verifyToken } from "../../src/server/token/verify";
import { verifyCaptcha } from "../../src/server/verifyCaptcha";
import { toPersianDigits } from "../../src/shared/digits";
import {
  CHALLENGE_TTL_MS,
  MAX_ATTEMPTS,
} from "../../src/shared/server-constants";

const SECRET = "phase4-image-secret-key-32chars!!";

/** Infinite secure-looking but deterministic filler after a prefix sequence. */
function paddedSequence(values: number[], fill = 1): RandomSource {
  let index = 0;
  return {
    int(min, max) {
      const value = index < values.length ? values[index]! : fill;
      index += 1;
      return Math.min(Math.max(value, min), max);
    },
  };
}

function parseSvgDimensions(svg: string): { width: number; height: number } {
  const widthMatch = svg.match(/\bwidth="(\d+)"/);
  const heightMatch = svg.match(/\bheight="(\d+)"/);
  expect(widthMatch).toBeTruthy();
  expect(heightMatch).toBeTruthy();
  return {
    width: Number(widthMatch![1]),
    height: Number(heightMatch![1]),
  };
}

describe("image CAPTCHA generation", () => {
  it("uses text length rules per difficulty", () => {
    expect(generateTextChallenge("easy", "en").answer).toHaveLength(4);
    expect(generateTextChallenge("medium", "en").answer).toHaveLength(5);
    expect(generateTextChallenge("hard", "en").answer).toHaveLength(6);

    const easy = generateImageChallenge(
      "easy",
      "en",
      paddedSequence([0, 1, 2, 3]),
    );
    expect(easy.answer).toHaveLength(4);
    expect(easy.image?.startsWith("data:image/svg+xml")).toBe(true);
    expect(easy).not.toHaveProperty("display");
  });

  it("excludes ambiguous characters", () => {
    for (let i = 0; i < 15; i += 1) {
      const { answer } = generateImageChallenge("hard", "en");
      expect(assertNoAmbiguousChars(answer)).toBe(true);
    }
  });

  it("does not return the answer on the public fields", () => {
    const generated = generateImageChallenge(
      "easy",
      "en",
      paddedSequence([0, 1, 2, 3]),
    );
    expect(generated.image).toBeTruthy();
    expect(JSON.stringify({ image: generated.image })).not.toContain(
      `"answer"`,
    );
  });
});

describe("image CAPTCHA renderer", () => {
  it("returns valid SVG markup with correct dimensions", () => {
    const svg = renderCaptchaImage({
      text: "ABCD",
      difficulty: "easy",
      locale: "en",
      random: paddedSequence([]),
    });

    expect(svg.startsWith("<svg")).toBe(true);
    const { width, height } = parseSvgDimensions(svg);
    expect(width).toBe(CAPTCHA_IMAGE_WIDTH);
    expect(height).toBe(CAPTCHA_IMAGE_HEIGHT);
    expect(svgToDataUrl(svg).startsWith("data:image/svg+xml")).toBe(true);
  });

  it("renders all difficulty levels", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const svg = renderCaptchaImage({
        text: "AB12",
        difficulty,
        locale: "en",
        random: paddedSequence([2]),
      });
      expect(parseSvgDimensions(svg).width).toBe(CAPTCHA_IMAGE_WIDTH);
    }
  });

  it("renders Persian digits without throwing", () => {
    const text = toPersianDigits("2345");
    const svg = renderCaptchaImage({
      text,
      difficulty: "medium",
      locale: "fa",
      random: paddedSequence([2]),
    });
    expect(svg).toContain(text[0]!);
    expect(parseSvgDimensions(svg).width).toBe(CAPTCHA_IMAGE_WIDTH);
  });

  it("escapes XML-special characters in challenge text", () => {
    const svg = renderCaptchaImage({
      text: "A<B",
      difficulty: "easy",
      locale: "en",
      random: paddedSequence([]),
    });
    expect(svg).toContain("&lt;");
    expect(svg.includes("<B")).toBe(false);
  });
});

describe("image CAPTCHA security workflow", () => {
  afterEach(() => {
    setDefaultStore(new MemoryStore());
  });

  it("createChallenge never returns the plaintext answer", async () => {
    const store = new MemoryStore();
    const result = await createChallenge({
      type: "image",
      secret: SECRET,
      store,
      random: paddedSequence([0, 1, 2, 3]),
    });
    expect(result.type).toBe("image");
    expect(result.challenge.image?.startsWith("data:image/svg+xml")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/"answer"/);
  });

  it("verifies a correct image answer", async () => {
    const isolated = new MemoryStore();
    const challenge = await createChallenge({
      type: "image",
      difficulty: "easy",
      locale: "en",
      secret: SECRET,
      store: isolated,
      random: paddedSequence([0, 1, 2, 3]),
    });
    const expected = generateImageChallenge(
      "easy",
      "en",
      paddedSequence([0, 1, 2, 3]),
    );
    const verified = await verifyCaptcha({
      token: challenge.token,
      answer: expected.answer,
      secret: SECRET,
      store: isolated,
    });
    expect(verified.success).toBe(true);
    if (verified.success) {
      expect(verified.token).toBeTruthy();
    }
  });

  it("rejects a wrong image answer", async () => {
    const isolated = new MemoryStore();
    const challenge = await createChallenge({
      type: "image",
      difficulty: "easy",
      locale: "en",
      secret: SECRET,
      store: isolated,
      random: paddedSequence([0, 1, 2, 3]),
    });
    const verified = await verifyCaptcha({
      token: challenge.token,
      answer: "XXXX",
      secret: SECRET,
      store: isolated,
    });
    expect(verified.success).toBe(false);
    if (!verified.success) {
      expect(verified.error).toBe("CAPTCHA_INVALID_ANSWER");
    }
  });

  it("issues a token with expected TTL metadata", async () => {
    const isolated = new MemoryStore();
    const now = 1_700_000_000_000;
    const challenge = await createChallenge({
      type: "image",
      secret: SECRET,
      store: isolated,
      now,
      random: paddedSequence([0, 1, 2, 3]),
    });
    expect(challenge.expiresAt).toBe(now + CHALLENGE_TTL_MS);
    const verified = verifyToken(challenge.token, SECRET, {
      expectKind: "challenge",
      now,
    });
    expect(verified.ok).toBe(true);
    if (verified.ok && verified.payload.kind === "challenge") {
      expect(verified.payload.maxAttempts).toBe(MAX_ATTEMPTS);
    }
  });
});
