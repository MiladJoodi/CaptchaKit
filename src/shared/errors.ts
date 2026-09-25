import type { CaptchaErrorCode } from "./types";

/**
 * Stable CaptchaKit error codes.
 * Messages are intentionally generic and must not leak sensitive details.
 */
export const CAPTCHA_ERROR_CODES = {
  CAPTCHA_EXPIRED: "CAPTCHA_EXPIRED",
  CAPTCHA_INVALID: "CAPTCHA_INVALID",
  CAPTCHA_ALREADY_USED: "CAPTCHA_ALREADY_USED",
  CAPTCHA_MAX_ATTEMPTS: "CAPTCHA_MAX_ATTEMPTS",
  CAPTCHA_RATE_LIMITED: "CAPTCHA_RATE_LIMITED",
  CAPTCHA_INVALID_ANSWER: "CAPTCHA_INVALID_ANSWER",
  CAPTCHA_MISSING_SECRET: "CAPTCHA_MISSING_SECRET",
} as const satisfies Record<CaptchaErrorCode, CaptchaErrorCode>;

/** Ordered list of all public error codes. */
export const CAPTCHA_ERROR_CODE_LIST = Object.values(
  CAPTCHA_ERROR_CODES,
) as CaptchaErrorCode[];

/**
 * Returns true if `value` is a known CaptchaKit error code.
 */
export function isCaptchaErrorCode(value: unknown): value is CaptchaErrorCode {
  return (
    typeof value === "string" &&
    (CAPTCHA_ERROR_CODE_LIST as string[]).includes(value)
  );
}
