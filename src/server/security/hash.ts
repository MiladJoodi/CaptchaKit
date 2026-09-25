import { createHmac, timingSafeEqual } from "node:crypto";
import type { CaptchaType } from "../../shared/types";
import { normalizeAnswer } from "./normalize";

export { normalizeAnswer } from "./normalize";

/**
 * HMAC-SHA256(secret, `${jti}:${normalizedAnswer}`) as base64url.
 * Bound to the challenge id so hashes are not reusable across challenges.
 */
export function hashAnswer(
  secret: string,
  jti: string,
  normalizedAnswer: string,
): string {
  return createHmac("sha256", secret)
    .update(`${jti}:${normalizedAnswer}`, "utf8")
    .digest("base64url");
}

/**
 * Timing-safe equality for equal-length strings (e.g. answer hashes).
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Normalize + hash an answer for a challenge, then compare to stored `ah`.
 */
export function verifyAnswerHash(options: {
  secret: string;
  jti: string;
  type: CaptchaType;
  answer: string;
  expectedHash: string;
}): boolean {
  const normalized = normalizeAnswer(options.answer, options.type);
  const actual = hashAnswer(options.secret, options.jti, normalized);
  return safeEqual(actual, options.expectedHash);
}
