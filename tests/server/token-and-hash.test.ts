import { describe, expect, it } from "vitest";
import {
  hashAnswer,
  normalizeAnswer,
  safeEqual,
  verifyAnswerHash,
} from "../../src/server/security/hash";
import { createId } from "../../src/server/security/random";
import { signChallengeToken, signProofToken } from "../../src/server/token/sign";
import { verifyToken } from "../../src/server/token/verify";
import { encodePayload, buildToken } from "../../src/server/token/codec";

const SECRET = "a".repeat(32);

describe("normalizeAnswer", () => {
  it("trims whitespace and removes internal spaces", () => {
    expect(normalizeAnswer("  ab cd  ", "text")).toBe("abcd");
  });

  it("lowercases text and image answers", () => {
    expect(normalizeAnswer("AbC", "text")).toBe("abc");
    expect(normalizeAnswer("XyZ", "image")).toBe("xyz");
  });

  it("does not lowercase number/math answers beyond digit conversion", () => {
    expect(normalizeAnswer("42", "number")).toBe("42");
    expect(normalizeAnswer("56", "math")).toBe("56");
  });

  it("converts Persian digits to English", () => {
    expect(normalizeAnswer("۱۲۳", "number")).toBe("123");
    expect(normalizeAnswer("۵۶", "math")).toBe("56");
  });

  it("converts Arabic-Indic digits to English", () => {
    expect(normalizeAnswer("٤٥٦", "number")).toBe("456");
  });

  it("is deterministic", () => {
    const a = normalizeAnswer("  ک7P  ", "text");
    const b = normalizeAnswer("  ک7P  ", "text");
    expect(a).toBe(b);
  });
});

describe("hashAnswer", () => {
  it("is deterministic for the same inputs", () => {
    const a = hashAnswer(SECRET, "jti-1", "abc");
    const b = hashAnswer(SECRET, "jti-1", "abc");
    expect(a).toBe(b);
  });

  it("differs when challenge jti differs", () => {
    const a = hashAnswer(SECRET, "jti-1", "abc");
    const b = hashAnswer(SECRET, "jti-2", "abc");
    expect(a).not.toBe(b);
  });

  it("never equals the plaintext answer", () => {
    const hash = hashAnswer(SECRET, "jti-1", "secretanswer");
    expect(hash).not.toBe("secretanswer");
    expect(hash.includes("secretanswer")).toBe(false);
  });

  it("verifyAnswerHash accepts the correct answer", () => {
    const jti = createId();
    const ah = hashAnswer(SECRET, jti, normalizeAnswer("K7P4X", "text"));
    expect(
      verifyAnswerHash({
        secret: SECRET,
        jti,
        type: "text",
        answer: " k7p4x ",
        expectedHash: ah,
      }),
    ).toBe(true);
  });

  it("verifyAnswerHash rejects the wrong answer", () => {
    const jti = createId();
    const ah = hashAnswer(SECRET, jti, normalizeAnswer("K7P4X", "text"));
    expect(
      verifyAnswerHash({
        secret: SECRET,
        jti,
        type: "text",
        answer: "WRONG",
        expectedHash: ah,
      }),
    ).toBe(false);
  });

  it("safeEqual is timing-safe for equal-length strings", () => {
    expect(safeEqual("aaaa", "aaaa")).toBe(true);
    expect(safeEqual("aaaa", "bbbb")).toBe(false);
    expect(safeEqual("aa", "aaaa")).toBe(false);
  });
});

describe("tokens", () => {
  it("signs and verifies a valid challenge token", () => {
    const { token, payload } = signChallengeToken({
      secret: SECRET,
      type: "math",
      difficulty: "medium",
      locale: "en",
      answer: "56",
    });

    const result = verifyToken(token, SECRET, { expectKind: "challenge" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.kind).toBe("challenge");
    expect(result.payload.jti).toBe(payload.jti);
    expect(result.payload).not.toHaveProperty("answer");
    if (result.payload.kind === "challenge") {
      expect(result.payload.ah).not.toContain("56");
      expect(JSON.stringify(result.payload)).not.toContain("56");
    }
  });

  it("signs and verifies a valid proof token", () => {
    const { token, payload } = signProofToken({
      secret: SECRET,
      cjti: "challenge-jti",
    });

    const result = verifyToken(token, SECRET, { expectKind: "proof" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.kind).toBe("proof");
    if (result.payload.kind === "proof") {
      expect(result.payload.cjti).toBe("challenge-jti");
      expect(result.payload.jti).toBe(payload.jti);
    }
  });

  it("rejects an invalid signature", () => {
    const { token } = signChallengeToken({
      secret: SECRET,
      type: "text",
      difficulty: "easy",
      locale: "en",
      answer: "ABCD",
    });

    const [body] = token.split(".");
    const tampered = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const result = verifyToken(tampered, SECRET);
    expect(result).toEqual({ ok: false, error: "CAPTCHA_INVALID" });
  });

  it("rejects a modified payload", () => {
    const { token, payload } = signChallengeToken({
      secret: SECRET,
      type: "text",
      difficulty: "easy",
      locale: "en",
      answer: "ABCD",
    });

    const modified = {
      ...payload,
      ah: hashAnswer(SECRET, payload.jti, "hacked"),
    };
    const forged = buildToken(encodePayload(modified), "b".repeat(32));
    // Re-sign with wrong secret → invalid under real secret
    expect(verifyToken(forged, SECRET)).toEqual({
      ok: false,
      error: "CAPTCHA_INVALID",
    });

    // Same secret but altered body with original signature
    const [encoded, signature] = token.split(".") as [string, string];
    const alteredBody = encodePayload(modified);
    expect(verifyToken(`${alteredBody}.${signature}`, SECRET)).toEqual({
      ok: false,
      error: "CAPTCHA_INVALID",
    });
    expect(encoded).not.toBe(alteredBody);
  });

  it("rejects an expired token", () => {
    const now = 1_000_000;
    const { token } = signChallengeToken({
      secret: SECRET,
      type: "number",
      difficulty: "easy",
      locale: "fa",
      answer: "1234",
      now,
      ttlMs: 1000,
    });

    expect(verifyToken(token, SECRET, { now: now + 1001 })).toEqual({
      ok: false,
      error: "CAPTCHA_EXPIRED",
    });
  });

  it("rejects unsupported token version", () => {
    const payload = {
      v: 99,
      kind: "challenge",
      jti: "x",
      type: "math",
      difficulty: "easy",
      locale: "en",
      ah: "hash",
      exp: Date.now() + 60_000,
      iat: Date.now(),
      maxAttempts: 5,
    };
    const token = buildToken(encodePayload(payload), SECRET);
    expect(verifyToken(token, SECRET)).toEqual({
      ok: false,
      error: "CAPTCHA_INVALID",
    });
  });

  it("rejects wrong token kind when expectKind is set", () => {
    const { token } = signProofToken({ secret: SECRET, cjti: "c1" });
    expect(verifyToken(token, SECRET, { expectKind: "challenge" })).toEqual({
      ok: false,
      error: "CAPTCHA_INVALID",
    });
  });

  it("rejects malformed tokens", () => {
    expect(verifyToken("", SECRET)).toEqual({
      ok: false,
      error: "CAPTCHA_INVALID",
    });
    expect(verifyToken("not-a-token", SECRET)).toEqual({
      ok: false,
      error: "CAPTCHA_INVALID",
    });
    expect(verifyToken("a.b.c", SECRET)).toEqual({
      ok: false,
      error: "CAPTCHA_INVALID",
    });
  });

  it("plaintext answer never appears in the wire token", () => {
    const answer = "UniqueAnswerXYZ99";
    const { token } = signChallengeToken({
      secret: SECRET,
      type: "text",
      difficulty: "hard",
      locale: "en",
      answer,
    });

    expect(token.includes(answer)).toBe(false);
    expect(token.toLowerCase().includes(answer.toLowerCase())).toBe(false);

    const [encoded] = token.split(".") as [string];
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    expect(json.includes(answer)).toBe(false);
  });
});
