import type {
  VerifyCaptchaOptions,
  VerifyCaptchaResult,
} from "../shared/types";
import { CaptchaError } from "./security/errors";
import { getDefaultStore } from "./security/defaultStore";
import { verifyAnswerHash } from "./security/hash";
import { getSecret } from "./security/secret";
import type { CaptchaStore } from "./security/store";
import { signProofToken } from "./token/sign";
import type { ChallengePayload, ProofPayload } from "./token/types";
import { verifyToken } from "./token/verify";

export interface VerifyCaptchaServerOptions extends VerifyCaptchaOptions {
  store?: CaptchaStore;
  secret?: string;
  now?: number;
}

/**
 * Verify a challenge answer (token + answer) or consume a proof token (token only).
 */
export async function verifyCaptcha(
  options: VerifyCaptchaServerOptions,
): Promise<VerifyCaptchaResult> {
  let secret: string;
  try {
    secret = options.secret ?? getSecret();
  } catch (error) {
    if (error instanceof CaptchaError) {
      return { success: false, error: error.code };
    }
    return { success: false, error: "CAPTCHA_MISSING_SECRET" };
  }

  const store = options.store ?? getDefaultStore();
  const now = options.now ?? Date.now();

  const verified = verifyToken(options.token, secret, { now });
  if (!verified.ok) {
    return { success: false, error: verified.error };
  }

  const payload = verified.payload;

  // Proof-only flow: no answer provided.
  if (options.answer === undefined) {
    if (payload.kind !== "proof") {
      return { success: false, error: "CAPTCHA_INVALID" };
    }
    return verifyProofToken(payload, store);
  }

  if (payload.kind !== "challenge") {
    return { success: false, error: "CAPTCHA_INVALID" };
  }

  return verifyChallengeAnswer(payload, options.answer, store, secret, now);
}

function verifyProofToken(
  payload: ProofPayload,
  store: CaptchaStore,
): VerifyCaptchaResult {
  const record = store.getProof(payload.jti);
  if (!record) {
    return { success: false, error: "CAPTCHA_INVALID" };
  }
  if (record.consumed) {
    return { success: false, error: "CAPTCHA_ALREADY_USED" };
  }

  const consumed = store.consumeProof(payload.jti);
  if (!consumed) {
    return { success: false, error: "CAPTCHA_ALREADY_USED" };
  }

  return { success: true };
}

function verifyChallengeAnswer(
  payload: ChallengePayload,
  answer: string,
  store: CaptchaStore,
  secret: string,
  now: number,
): VerifyCaptchaResult {
  const record = store.getChallenge(payload.jti);
  if (!record) {
    // Missing/expired in store — do not distinguish for callers.
    if (payload.exp <= now) {
      return { success: false, error: "CAPTCHA_EXPIRED" };
    }
    return { success: false, error: "CAPTCHA_INVALID" };
  }

  if (record.consumed) {
    return { success: false, error: "CAPTCHA_ALREADY_USED" };
  }

  if (record.attempts >= record.maxAttempts) {
    return { success: false, error: "CAPTCHA_MAX_ATTEMPTS" };
  }

  const matches = verifyAnswerHash({
    secret,
    jti: payload.jti,
    type: payload.type,
    answer,
    expectedHash: payload.ah,
  });

  if (!matches) {
    const attempt = store.incrementAttempts(payload.jti);
    if (!attempt) {
      // Consumed/expired/missing between checks.
      const latest = store.getChallenge(payload.jti);
      if (!latest) {
        return { success: false, error: "CAPTCHA_INVALID" };
      }
      if (latest.consumed) {
        return { success: false, error: "CAPTCHA_ALREADY_USED" };
      }
      return { success: false, error: "CAPTCHA_INVALID_ANSWER" };
    }
    if (attempt.maxReached) {
      return { success: false, error: "CAPTCHA_MAX_ATTEMPTS" };
    }
    return { success: false, error: "CAPTCHA_INVALID_ANSWER" };
  }

  const consumed = store.consumeChallenge(payload.jti);
  if (!consumed) {
    return { success: false, error: "CAPTCHA_ALREADY_USED" };
  }

  const { token: proofToken, payload: proofPayload } = signProofToken({
    secret,
    cjti: payload.jti,
    now,
  });

  store.registerProof({
    jti: proofPayload.jti,
    expiresAt: proofPayload.exp,
  });

  return {
    success: true,
    token: proofToken,
  };
}
