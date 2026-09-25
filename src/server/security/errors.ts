import type { CaptchaErrorCode } from "../../shared/types";

/**
 * Public CaptchaKit error carrying a stable error code.
 * Message is the code only — never include secrets or answers.
 */
export class CaptchaError extends Error {
  readonly code: CaptchaErrorCode;

  constructor(code: CaptchaErrorCode) {
    super(code);
    this.name = "CaptchaError";
    this.code = code;
  }
}

export function isCaptchaError(value: unknown): value is CaptchaError {
  return value instanceof CaptchaError;
}
