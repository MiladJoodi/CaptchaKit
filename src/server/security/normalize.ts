import { toEnglishDigits } from "../../shared/digits";
import type { CaptchaType } from "../../shared/types";

/**
 * Deterministic answer normalization used for hashing and verification.
 * Never return or log this value to the client.
 */
export function normalizeAnswer(answer: string, type: CaptchaType): string {
  let value = answer.trim();
  value = toEnglishDigits(value);
  value = value.replace(/\s+/g, "");

  if (type === "text" || type === "image") {
    value = value.toLowerCase();
  }

  return value;
}
