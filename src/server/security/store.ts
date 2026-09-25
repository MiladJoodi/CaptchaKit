export interface ChallengeRecord {
  jti: string;
  maxAttempts: number;
  attempts: number;
  consumed: boolean;
  expiresAt: number;
}

export interface ProofRecord {
  jti: string;
  consumed: boolean;
  expiresAt: number;
}

export interface IncrementAttemptsResult {
  attempts: number;
  maxReached: boolean;
}

/**
 * Pluggable store for challenge/proof state and rate-limit windows.
 * v1 ships MemoryStore only — no Redis adapter.
 */
export interface CaptchaStore {
  registerChallenge(
    record: Omit<ChallengeRecord, "attempts" | "consumed">,
  ): void;

  getChallenge(jti: string): ChallengeRecord | null;

  /**
   * Atomically mark a challenge as consumed.
   * Returns false if missing, expired, or already consumed.
   */
  consumeChallenge(jti: string): boolean;

  /**
   * Increment failed attempts when the challenge is still usable.
   * Returns null if missing, expired, consumed, or already at max.
   */
  incrementAttempts(jti: string): IncrementAttemptsResult | null;

  registerProof(record: Omit<ProofRecord, "consumed">): void;

  getProof(jti: string): ProofRecord | null;

  /**
   * Atomically mark a proof as consumed.
   * Returns false if missing, expired, or already consumed.
   */
  consumeProof(jti: string): boolean;

  /**
   * Sliding-window rate limit hit.
   * Records the current timestamp when allowed; returns whether allowed.
   */
  hitRateLimit(identifier: string, max: number, windowMs: number): boolean;

  /** Remove expired entries. */
  cleanup(now?: number): void;

  /** Stop background timers / release resources. */
  destroy(): void;
}
