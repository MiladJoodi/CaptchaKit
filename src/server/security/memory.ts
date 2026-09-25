import type {
  CaptchaStore,
  ChallengeRecord,
  IncrementAttemptsResult,
  ProofRecord,
} from "./store";

export interface MemoryStoreOptions {
  /** Background cleanup interval. `0` disables. Default: 60_000. */
  cleanupIntervalMs?: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

/**
 * Process-local CaptchaStore with TTL eviction.
 * Concurrent consume within one process is atomic (sync Map ops).
 */
export class MemoryStore implements CaptchaStore {
  private readonly challenges = new Map<string, ChallengeRecord>();
  private readonly proofs = new Map<string, ProofRecord>();
  private readonly rateLimits = new Map<string, RateLimitEntry>();
  private readonly timer: ReturnType<typeof setInterval> | null;

  constructor(options: MemoryStoreOptions = {}) {
    const interval =
      options.cleanupIntervalMs === undefined
        ? 60_000
        : options.cleanupIntervalMs;

    if (interval > 0) {
      this.timer = setInterval(() => {
        this.cleanup();
      }, interval);
      this.timer.unref?.();
    } else {
      this.timer = null;
    }
  }

  registerChallenge(
    record: Omit<ChallengeRecord, "attempts" | "consumed">,
  ): void {
    this.challenges.set(record.jti, {
      jti: record.jti,
      maxAttempts: record.maxAttempts,
      attempts: 0,
      consumed: false,
      expiresAt: record.expiresAt,
    });
  }

  getChallenge(jti: string): ChallengeRecord | null {
    const record = this.challenges.get(jti);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      this.challenges.delete(jti);
      return null;
    }
    return { ...record };
  }

  consumeChallenge(jti: string): boolean {
    const record = this.challenges.get(jti);
    if (!record) return false;
    if (record.expiresAt <= Date.now()) {
      this.challenges.delete(jti);
      return false;
    }
    if (record.consumed) return false;
    record.consumed = true;
    return true;
  }

  incrementAttempts(jti: string): IncrementAttemptsResult | null {
    const record = this.challenges.get(jti);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      this.challenges.delete(jti);
      return null;
    }
    if (record.consumed) return null;
    if (record.attempts >= record.maxAttempts) {
      return { attempts: record.attempts, maxReached: true };
    }

    record.attempts += 1;
    return {
      attempts: record.attempts,
      maxReached: record.attempts >= record.maxAttempts,
    };
  }

  registerProof(record: Omit<ProofRecord, "consumed">): void {
    this.proofs.set(record.jti, {
      jti: record.jti,
      consumed: false,
      expiresAt: record.expiresAt,
    });
  }

  getProof(jti: string): ProofRecord | null {
    const record = this.proofs.get(jti);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      this.proofs.delete(jti);
      return null;
    }
    return { ...record };
  }

  consumeProof(jti: string): boolean {
    const record = this.proofs.get(jti);
    if (!record) return false;
    if (record.expiresAt <= Date.now()) {
      this.proofs.delete(jti);
      return false;
    }
    if (record.consumed) return false;
    record.consumed = true;
    return true;
  }

  hitRateLimit(identifier: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(identifier) ?? { timestamps: [] };
    const windowStart = now - windowMs;
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= max) {
      this.rateLimits.set(identifier, entry);
      return false;
    }

    entry.timestamps.push(now);
    this.rateLimits.set(identifier, entry);
    return true;
  }

  cleanup(now = Date.now()): void {
    for (const [jti, record] of this.challenges) {
      if (record.expiresAt <= now) {
        this.challenges.delete(jti);
      }
    }

    for (const [jti, record] of this.proofs) {
      if (record.expiresAt <= now) {
        this.proofs.delete(jti);
      }
    }

    for (const [id, entry] of this.rateLimits) {
      entry.timestamps = entry.timestamps.filter(
        (ts) => ts > now - 60 * 60 * 1000,
      );
      if (entry.timestamps.length === 0) {
        this.rateLimits.delete(id);
      } else {
        this.rateLimits.set(id, entry);
      }
    }
  }

  /** Test helper: approximate entry counts (ignores TTL filtering). */
  size(): { challenges: number; proofs: number; rateLimits: number } {
    return {
      challenges: this.challenges.size,
      proofs: this.proofs.size,
      rateLimits: this.rateLimits.size,
    };
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.challenges.clear();
    this.proofs.clear();
    this.rateLimits.clear();
  }
}
