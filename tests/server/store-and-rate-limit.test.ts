import { afterEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/server/security/memory";
import { RateLimiter } from "../../src/server/security/rateLimit";

describe("MemoryStore", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
  });

  it("registers and retrieves a challenge", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const expiresAt = Date.now() + 60_000;
    store.registerChallenge({ jti: "c1", maxAttempts: 5, expiresAt });

    const record = store.getChallenge("c1");
    expect(record).toMatchObject({
      jti: "c1",
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
      expiresAt,
    });
  });

  it("consumes a challenge once", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    store.registerChallenge({
      jti: "c1",
      maxAttempts: 5,
      expiresAt: Date.now() + 60_000,
    });

    expect(store.consumeChallenge("c1")).toBe(true);
    expect(store.consumeChallenge("c1")).toBe(false);
    expect(store.getChallenge("c1")?.consumed).toBe(true);
  });

  it("counts attempts until max", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    store.registerChallenge({
      jti: "c1",
      maxAttempts: 3,
      expiresAt: Date.now() + 60_000,
    });

    expect(store.incrementAttempts("c1")).toEqual({
      attempts: 1,
      maxReached: false,
    });
    expect(store.incrementAttempts("c1")).toEqual({
      attempts: 2,
      maxReached: false,
    });
    expect(store.incrementAttempts("c1")).toEqual({
      attempts: 3,
      maxReached: true,
    });
    expect(store.incrementAttempts("c1")).toEqual({
      attempts: 3,
      maxReached: true,
    });
  });

  it("does not increment attempts after consume", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    store.registerChallenge({
      jti: "c1",
      maxAttempts: 5,
      expiresAt: Date.now() + 60_000,
    });
    store.consumeChallenge("c1");
    expect(store.incrementAttempts("c1")).toBeNull();
  });

  it("does not increment attempts after expiry", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    store.registerChallenge({
      jti: "c1",
      maxAttempts: 5,
      expiresAt: Date.now() - 1,
    });
    expect(store.incrementAttempts("c1")).toBeNull();
    expect(store.getChallenge("c1")).toBeNull();
  });

  it("expires challenges via TTL", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    store.registerChallenge({
      jti: "c1",
      maxAttempts: 5,
      expiresAt: Date.now() - 10,
    });
    expect(store.getChallenge("c1")).toBeNull();
    expect(store.consumeChallenge("c1")).toBe(false);
  });

  it("cleanup removes expired entries", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const now = Date.now();
    store.registerChallenge({
      jti: "old",
      maxAttempts: 5,
      expiresAt: now - 1,
    });
    store.registerChallenge({
      jti: "fresh",
      maxAttempts: 5,
      expiresAt: now + 60_000,
    });
    store.registerProof({ jti: "p-old", expiresAt: now - 1 });
    store.registerProof({ jti: "p-fresh", expiresAt: now + 60_000 });

    store.cleanup(now);
    expect(store.size().challenges).toBe(1);
    expect(store.size().proofs).toBe(1);
    expect(store.getChallenge("fresh")).not.toBeNull();
    expect(store.getProof("p-fresh")).not.toBeNull();
  });

  it("registers and consumes proofs once", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    store.registerProof({ jti: "p1", expiresAt: Date.now() + 60_000 });
    expect(store.consumeProof("p1")).toBe(true);
    expect(store.consumeProof("p1")).toBe(false);
  });

  it("only one concurrent consume succeeds", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    store.registerChallenge({
      jti: "race",
      maxAttempts: 5,
      expiresAt: Date.now() + 60_000,
    });

    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        Promise.resolve(store.consumeChallenge("race")),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((v) => !v)).toHaveLength(49);
  });
});

describe("RateLimiter", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
  });

  it("allows requests under the limit", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const limiter = new RateLimiter(store, { max: 3, windowMs: 60_000 });

    expect(limiter.hit("ip-1").allowed).toBe(true);
    expect(limiter.hit("ip-1").allowed).toBe(true);
    expect(limiter.hit("ip-1").allowed).toBe(true);
  });

  it("blocks when the limit is reached", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const limiter = new RateLimiter(store, { max: 2, windowMs: 60_000 });

    expect(limiter.hit("ip-1").allowed).toBe(true);
    expect(limiter.hit("ip-1").allowed).toBe(true);
    expect(limiter.hit("ip-1").allowed).toBe(false);
  });

  it("keeps identifiers independent", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const limiter = new RateLimiter(store, { max: 1, windowMs: 60_000 });

    expect(limiter.hit("a").allowed).toBe(true);
    expect(limiter.hit("a").allowed).toBe(false);
    expect(limiter.hit("b").allowed).toBe(true);
  });

  it("allows traffic again after the window expires", () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const windowMs = 50;
    const limiter = new RateLimiter(store, { max: 1, windowMs });

    expect(limiter.hit("ip-1").allowed).toBe(true);
    expect(limiter.hit("ip-1").allowed).toBe(false);

    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          expect(limiter.hit("ip-1").allowed).toBe(true);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, windowMs + 20);
    });
  });
});
