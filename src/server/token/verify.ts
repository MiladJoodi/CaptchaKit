import { decodePayload, splitToken, verifySignature } from "./codec";
import type {
  ChallengePayload,
  ProofPayload,
  TokenPayload,
  VerifyTokenOptions,
  VerifyTokenResult,
} from "./types";
import { TOKEN_VERSION } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChallengePayload(value: unknown): value is ChallengePayload {
  if (!isObject(value)) return false;
  return (
    value.v === TOKEN_VERSION &&
    value.kind === "challenge" &&
    typeof value.jti === "string" &&
    typeof value.type === "string" &&
    typeof value.difficulty === "string" &&
    typeof value.locale === "string" &&
    typeof value.ah === "string" &&
    typeof value.exp === "number" &&
    typeof value.iat === "number" &&
    typeof value.maxAttempts === "number"
  );
}

function isProofPayload(value: unknown): value is ProofPayload {
  if (!isObject(value)) return false;
  return (
    value.v === TOKEN_VERSION &&
    value.kind === "proof" &&
    typeof value.jti === "string" &&
    typeof value.cjti === "string" &&
    typeof value.exp === "number" &&
    typeof value.iat === "number"
  );
}

function isTokenPayload(value: unknown): value is TokenPayload {
  return isChallengePayload(value) || isProofPayload(value);
}

/**
 * Verifies HMAC signature, structure, kind, and expiry.
 * Does not consult the store (consumption is separate).
 */
export function verifyToken(
  token: string,
  secret: string,
  options: VerifyTokenOptions = {},
): VerifyTokenResult {
  const parts = splitToken(token);
  if (!parts) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  if (!verifySignature(parts.encoded, parts.signature, secret)) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  let decoded: unknown;
  try {
    decoded = decodePayload(parts.encoded);
  } catch {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  if (!isTokenPayload(decoded)) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  if (options.expectKind && decoded.kind !== options.expectKind) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  const now = options.now ?? Date.now();
  if (decoded.exp <= now) {
    return { ok: false, error: "CAPTCHA_EXPIRED" };
  }

  return { ok: true, payload: decoded };
}
