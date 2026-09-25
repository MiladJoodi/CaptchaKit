import { describe, expect, it } from "vitest";
import {
  CAPTCHA_TYPES,
  DIFFICULTIES,
  LOCALES,
  THEMES,
  DEFAULT_CAPTCHA_TYPE,
  DEFAULT_DIFFICULTY,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
} from "../../src/shared/constants";
import {
  CAPTCHA_ERROR_CODES,
  CAPTCHA_ERROR_CODE_LIST,
  isCaptchaErrorCode,
} from "../../src/shared/errors";

describe("shared constants", () => {
  it("exposes expected CAPTCHA types", () => {
    expect(CAPTCHA_TYPES).toEqual(["text", "number", "math", "image"]);
    expect(DEFAULT_CAPTCHA_TYPE).toBe("math");
  });

  it("exposes expected locales, difficulties, and themes", () => {
    expect(LOCALES).toEqual(["en", "fa"]);
    expect(DIFFICULTIES).toEqual(["easy", "medium", "hard"]);
    expect(THEMES).toEqual(["light", "dark"]);
    expect(DEFAULT_LOCALE).toBe("en");
    expect(DEFAULT_DIFFICULTY).toBe("medium");
    expect(DEFAULT_THEME).toBe("light");
  });
});

describe("shared error codes", () => {
  const expected = [
    "CAPTCHA_EXPIRED",
    "CAPTCHA_INVALID",
    "CAPTCHA_ALREADY_USED",
    "CAPTCHA_MAX_ATTEMPTS",
    "CAPTCHA_RATE_LIMITED",
    "CAPTCHA_INVALID_ANSWER",
    "CAPTCHA_MISSING_SECRET",
  ] as const;

  it("defines all stable error codes", () => {
    for (const code of expected) {
      expect(CAPTCHA_ERROR_CODES[code]).toBe(code);
    }
    expect(CAPTCHA_ERROR_CODE_LIST).toEqual([...expected]);
  });

  it("isCaptchaErrorCode recognizes known codes only", () => {
    expect(isCaptchaErrorCode("CAPTCHA_EXPIRED")).toBe(true);
    expect(isCaptchaErrorCode("NOT_A_CODE")).toBe(false);
    expect(isCaptchaErrorCode(null)).toBe(false);
  });
});
