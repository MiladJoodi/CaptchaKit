import { describe, expect, it, vi } from "vitest";
import {
  getSecret,
  isValidSecret,
} from "../../src/server/security/secret";
import { CaptchaError } from "../../src/server/security/errors";
import { SECRET_ENV_KEY, SECRET_MIN_LENGTH } from "../../src/shared/server-constants";

describe("getSecret", () => {
  it("returns a valid secret", () => {
    const secret = "x".repeat(SECRET_MIN_LENGTH);
    expect(getSecret({ [SECRET_ENV_KEY]: secret })).toBe(secret);
  });

  it("throws CAPTCHA_MISSING_SECRET when missing", () => {
    expect(() => getSecret({})).toThrow(CaptchaError);
    try {
      getSecret({});
    } catch (error) {
      expect(error).toBeInstanceOf(CaptchaError);
      expect((error as CaptchaError).code).toBe("CAPTCHA_MISSING_SECRET");
      expect((error as CaptchaError).message).toBe("CAPTCHA_MISSING_SECRET");
    }
  });

  it("throws when secret is shorter than 32 characters", () => {
    expect(() =>
      getSecret({ [SECRET_ENV_KEY]: "too-short" }),
    ).toThrowError(/CAPTCHA_MISSING_SECRET/);
  });

  it("never logs the secret value", () => {
    const secret = "s".repeat(SECRET_MIN_LENGTH);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    getSecret({ [SECRET_ENV_KEY]: secret });
    try {
      getSecret({ [SECRET_ENV_KEY]: "short" });
    } catch {
      // expected
    }

    const logged = [...spy.mock.calls, ...errSpy.mock.calls]
      .flat()
      .map(String)
      .join(" ");
    expect(logged.includes(secret)).toBe(false);

    spy.mockRestore();
    errSpy.mockRestore();
  });

  it("isValidSecret checks length only", () => {
    expect(isValidSecret("x".repeat(31))).toBe(false);
    expect(isValidSecret("x".repeat(32))).toBe(true);
    expect(isValidSecret(null)).toBe(false);
  });
});
