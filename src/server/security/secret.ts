import {
  SECRET_ENV_KEY,
  SECRET_MIN_LENGTH,
} from "../../shared/server-constants";
import { CaptchaError } from "./errors";

export type SecretEnv = Record<string, string | undefined>;

/**
 * Reads and validates CAPTCHAKIT_SECRET.
 * Never logs or returns partial secrets on failure.
 */
export function getSecret(env: SecretEnv = process.env): string {
  const secret = env[SECRET_ENV_KEY];

  if (typeof secret !== "string" || secret.length < SECRET_MIN_LENGTH) {
    throw new CaptchaError("CAPTCHA_MISSING_SECRET");
  }

  return secret;
}

/**
 * Returns whether a value looks like a valid secret without exposing it.
 */
export function isValidSecret(value: unknown): value is string {
  return typeof value === "string" && value.length >= SECRET_MIN_LENGTH;
}
