import {
  DEFAULT_CAPTCHA_TYPE,
  DEFAULT_DIFFICULTY,
  DEFAULT_LOCALE,
} from "../shared/constants";
import {
  CHALLENGE_TTL_MS,
  MAX_ATTEMPTS,
} from "../shared/server-constants";
import type {
  CaptchaChallengeDisplay,
  CreateChallengeOptions,
  CreateChallengeResult,
} from "../shared/types";
import { generateChallengeContent } from "./captcha/generate";
import type { RandomSource } from "./captcha/random";
import type { GeneratedChallenge } from "./captcha/types";
import { CaptchaError } from "./security/errors";
import { getDefaultStore } from "./security/defaultStore";
import { RateLimiter } from "./security/rateLimit";
import { getSecret } from "./security/secret";
import type { CaptchaStore } from "./security/store";
import { signChallengeToken } from "./token/sign";

export interface CreateChallengeServerOptions extends CreateChallengeOptions {
  /** Rate-limit key (e.g. IP). When set, challenge creation is rate-limited. */
  identifier?: string;
  store?: CaptchaStore;
  secret?: string;
  now?: number;
  random?: RandomSource;
}

function toPublicChallenge(
  generated: GeneratedChallenge,
): CaptchaChallengeDisplay {
  if ("image" in generated && generated.image) {
    return { image: generated.image };
  }
  if ("display" in generated && generated.display) {
    return { display: generated.display };
  }
  return {};
}

/**
 * Create a signed CAPTCHA challenge.
 * The plaintext answer is never included in the returned object.
 */
export async function createChallenge(
  options: CreateChallengeServerOptions = {},
): Promise<CreateChallengeResult> {
  const type = options.type ?? DEFAULT_CAPTCHA_TYPE;
  const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY;
  const locale = options.locale ?? DEFAULT_LOCALE;
  const now = options.now ?? Date.now();
  const store = options.store ?? getDefaultStore();

  let secret: string;
  try {
    secret = options.secret ?? getSecret();
  } catch (error) {
    if (error instanceof CaptchaError) throw error;
    throw new CaptchaError("CAPTCHA_MISSING_SECRET");
  }

  if (options.identifier) {
    const limiter = new RateLimiter(store);
    const { allowed } = limiter.hit(options.identifier);
    if (!allowed) {
      throw new CaptchaError("CAPTCHA_RATE_LIMITED");
    }
  }

  const generated = generateChallengeContent(
    type,
    difficulty,
    locale,
    options.random,
  );

  const { token, payload } = signChallengeToken({
    secret,
    type,
    difficulty,
    locale,
    answer: generated.answer,
    maxAttempts: MAX_ATTEMPTS,
    ttlMs: CHALLENGE_TTL_MS,
    now,
  });

  store.registerChallenge({
    jti: payload.jti,
    maxAttempts: payload.maxAttempts,
    expiresAt: payload.exp,
  });

  return {
    token,
    type,
    challenge: toPublicChallenge(generated),
    expiresAt: payload.exp,
  };
}
