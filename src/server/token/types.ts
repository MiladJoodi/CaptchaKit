import type { CaptchaType, Difficulty, Locale } from "../../shared/types";

export const TOKEN_VERSION = 1 as const;

export type TokenKind = "challenge" | "proof";

export interface ChallengePayload {
  v: typeof TOKEN_VERSION;
  kind: "challenge";
  jti: string;
  type: CaptchaType;
  difficulty: Difficulty;
  locale: Locale;
  /** HMAC of normalized answer bound to jti — never plaintext. */
  ah: string;
  exp: number;
  iat: number;
  maxAttempts: number;
}

export interface ProofPayload {
  v: typeof TOKEN_VERSION;
  kind: "proof";
  jti: string;
  /** Original challenge jti. */
  cjti: string;
  exp: number;
  iat: number;
}

export type TokenPayload = ChallengePayload | ProofPayload;

export interface SignChallengeTokenInput {
  secret: string;
  type: CaptchaType;
  difficulty: Difficulty;
  locale: Locale;
  /** Plaintext answer — normalized and hashed; never stored in the token. */
  answer: string;
  jti?: string;
  maxAttempts?: number;
  ttlMs?: number;
  now?: number;
}

export interface SignProofTokenInput {
  secret: string;
  /** Challenge jti that was successfully verified. */
  cjti: string;
  jti?: string;
  ttlMs?: number;
  now?: number;
}

export type VerifyTokenSuccess<T extends TokenPayload = TokenPayload> = {
  ok: true;
  payload: T;
};

export type VerifyTokenFailure = {
  ok: false;
  error: "CAPTCHA_INVALID" | "CAPTCHA_EXPIRED";
};

export type VerifyTokenResult<T extends TokenPayload = TokenPayload> =
  | VerifyTokenSuccess<T>
  | VerifyTokenFailure;

export interface VerifyTokenOptions {
  expectKind?: TokenKind;
  now?: number;
}
