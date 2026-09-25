import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "../../shared/server-constants";
import type { CaptchaStore } from "./store";

export interface RateLimiterOptions {
  max?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
}

/**
 * Process-local sliding-window rate limiter backed by a CaptchaStore.
 */
export class RateLimiter {
  private readonly max: number;
  private readonly windowMs: number;

  constructor(
    private readonly store: CaptchaStore,
    options: RateLimiterOptions = {},
  ) {
    this.max = options.max ?? RATE_LIMIT_MAX;
    this.windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  }

  /**
   * Record a challenge-creation attempt for `identifier`.
   * Returns whether the request is allowed under the current window.
   */
  hit(identifier: string): RateLimitResult {
    const allowed = this.store.hitRateLimit(
      identifier,
      this.max,
      this.windowMs,
    );
    return { allowed };
  }
}
