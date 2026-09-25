/**
 * Server-oriented constants (TTL, rate limits, secret config).
 * Import from captchakit/server — not the client entry.
 */

/** Challenge token lifetime in milliseconds (5 minutes). */
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Proof token lifetime in milliseconds (10 minutes). */
export const PROOF_TTL_MS = 10 * 60 * 1000;

/** Maximum answer attempts per challenge. */
export const MAX_ATTEMPTS = 5;

/** Maximum challenge creations per identifier per rate-limit window. */
export const RATE_LIMIT_MAX = 20;

/** Rate-limit window length in milliseconds (1 minute). */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Environment variable name for the HMAC signing secret. */
export const SECRET_ENV_KEY = "CAPTCHAKIT_SECRET";

/** Minimum allowed length for CAPTCHAKIT_SECRET. */
export const SECRET_MIN_LENGTH = 32;
