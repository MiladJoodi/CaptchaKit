import {
  CHALLENGE_TTL_MS,
  MAX_ATTEMPTS,
  PROOF_TTL_MS,
} from "../../shared/server-constants";
import { hashAnswer, normalizeAnswer } from "../security/hash";
import { createId } from "../security/random";
import { buildToken, encodePayload } from "./codec";
import type {
  ChallengePayload,
  ProofPayload,
  SignChallengeTokenInput,
  SignProofTokenInput,
} from "./types";
import { TOKEN_VERSION } from "./types";

export function signChallengeToken(
  input: SignChallengeTokenInput,
): { token: string; payload: ChallengePayload } {
  const now = input.now ?? Date.now();
  const jti = input.jti ?? createId();
  const ttlMs = input.ttlMs ?? CHALLENGE_TTL_MS;
  const maxAttempts = input.maxAttempts ?? MAX_ATTEMPTS;

  const normalized = normalizeAnswer(input.answer, input.type);
  const ah = hashAnswer(input.secret, jti, normalized);

  const payload: ChallengePayload = {
    v: TOKEN_VERSION,
    kind: "challenge",
    jti,
    type: input.type,
    difficulty: input.difficulty,
    locale: input.locale,
    ah,
    iat: now,
    exp: now + ttlMs,
    maxAttempts,
  };

  const token = buildToken(encodePayload(payload), input.secret);
  return { token, payload };
}

export function signProofToken(
  input: SignProofTokenInput,
): { token: string; payload: ProofPayload } {
  const now = input.now ?? Date.now();
  const jti = input.jti ?? createId();
  const ttlMs = input.ttlMs ?? PROOF_TTL_MS;

  const payload: ProofPayload = {
    v: TOKEN_VERSION,
    kind: "proof",
    jti,
    cjti: input.cjti,
    iat: now,
    exp: now + ttlMs,
  };

  const token = buildToken(encodePayload(payload), input.secret);
  return { token, payload };
}
