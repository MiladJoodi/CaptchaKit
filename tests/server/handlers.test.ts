import { afterEach, describe, expect, it } from "vitest";
import { createCaptchaHandlers } from "../../src/server/handlers";
import { MemoryStore } from "../../src/server/security/memory";
import { setDefaultStore } from "../../src/server/security/defaultStore";
import { verifyToken } from "../../src/server/token/verify";
import { RATE_LIMIT_MAX } from "../../src/shared/server-constants";
import { generateTextChallenge } from "../../src/server/captcha/text";
import type { RandomSource } from "../../src/server/captcha/random";

const SECRET = "phase6-handlers-secret-key-32ch!!";

function sequenceRandom(values: number[]): RandomSource {
  let index = 0;
  return {
    int(min, max) {
      if (index >= values.length) {
        throw new Error(`sequenceRandom exhausted at ${index}`);
      }
      const value = values[index++]!;
      if (value < min || value > max) {
        throw new Error(`out of range ${value} vs [${min},${max}]`);
      }
      return value;
    },
  };
}

function paddedSequence(values: number[], fill = 1): RandomSource {
  let index = 0;
  return {
    int(min, max) {
      const raw = index < values.length ? values[index]! : fill;
      index += 1;
      return Math.min(Math.max(raw, min), max);
    },
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("createCaptchaHandlers GET", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
    setDefaultStore(null);
  });

  it("creates a default math challenge", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { GET } = createCaptchaHandlers({ store, secret: SECRET });
    const response = await GET(new Request("http://localhost/api/captcha"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = await readJson(response);
    expect(body.type).toBe("math");
    expect(typeof body.token).toBe("string");
    expect(typeof body.expiresAt).toBe("number");
    expect(body.challenge).toEqual(
      expect.objectContaining({ display: expect.any(String) }),
    );
    expect(JSON.stringify(body)).not.toContain('"answer"');
    expect(JSON.stringify(body)).not.toContain(SECRET);

    const verified = verifyToken(body.token as string, SECRET);
    expect(verified.ok).toBe(true);
    if (verified.ok && verified.payload.kind === "challenge") {
      expect(JSON.stringify(verified.payload)).not.toMatch(/=\s*\d+/);
    }
  });

  it("supports text, number, math, image, locale, and difficulty", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { GET } = createCaptchaHandlers({ store, secret: SECRET });

    const text = await GET(
      new Request("http://localhost/api/captcha?type=text&difficulty=easy"),
    );
    expect((await readJson(text)).type).toBe("text");

    const number = await GET(
      new Request(
        "http://localhost/api/captcha?type=number&locale=fa&difficulty=easy",
      ),
    );
    const numberBody = await readJson(number);
    expect(numberBody.type).toBe("number");
    expect((numberBody.challenge as { display: string }).display).toMatch(
      /[۰-۹]/,
    );

    const image = await GET(
      new Request("http://localhost/api/captcha?type=image&difficulty=easy"),
    );
    const imageBody = await readJson(image);
    expect(imageBody.type).toBe("image");
    expect((imageBody.challenge as { image: string }).image).toMatch(
      /^data:image\/svg\+xml/,
    );
    expect(imageBody.challenge).not.toHaveProperty("display");
  });

  it("rejects invalid query parameters", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { GET } = createCaptchaHandlers({ store, secret: SECRET });

    const response = await GET(
      new Request("http://localhost/api/captcha?type=emoji"),
    );
    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      success: false,
      error: "CAPTCHA_INVALID",
    });
  });

  it("rate limits by identifier", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { GET } = createCaptchaHandlers({
      store,
      secret: SECRET,
      getIdentifier: () => "ip-a",
    });

    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const ok = await GET(new Request("http://localhost/api/captcha"));
      expect(ok.status).toBe(200);
    }

    const limited = await GET(new Request("http://localhost/api/captcha"));
    expect(limited.status).toBe(429);
    expect(await readJson(limited)).toEqual({
      success: false,
      error: "CAPTCHA_RATE_LIMITED",
    });
  });

  it("keeps identifiers independent", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    let current = "a";
    const { GET } = createCaptchaHandlers({
      store,
      secret: SECRET,
      getIdentifier: () => current,
    });

    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      expect((await GET(new Request("http://localhost/api/captcha"))).status).toBe(
        200,
      );
    }
    expect((await GET(new Request("http://localhost/api/captcha"))).status).toBe(
      429,
    );

    current = "b";
    expect((await GET(new Request("http://localhost/api/captcha"))).status).toBe(
      200,
    );
  });

  it("uses custom getIdentifier and default fallback", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const seen: string[] = [];
    const { GET } = createCaptchaHandlers({
      store,
      secret: SECRET,
      getIdentifier: (request) => {
        const id = request.headers.get("x-test-id") ?? "fallback";
        seen.push(id);
        return id;
      },
    });

    await GET(
      new Request("http://localhost/api/captcha", {
        headers: { "x-test-id": "user-1" },
      }),
    );
    expect(seen).toContain("user-1");

    const { defaultGetIdentifier } = await import("../../src/server/handlers");
    expect(
      defaultGetIdentifier(
        new Request("http://localhost/api/captcha", {
          headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
        }),
      ),
    ).toBe("1.2.3.4");
    expect(
      defaultGetIdentifier(new Request("http://localhost/api/captcha")),
    ).toBe("anonymous");
  });
});

describe("createCaptchaHandlers POST", () => {
  let store: MemoryStore;

  afterEach(() => {
    store?.destroy();
    setDefaultStore(null);
  });

  async function createTextChallenge(): Promise<{
    token: string;
    answer: string;
  }> {
    // Use createChallenge via GET with controlled store, then recover answer
    // by creating a parallel known challenge through low-level APIs.
    const { createChallenge } = await import("../../src/server/createChallenge");
    const expected = generateTextChallenge(
      "easy",
      "en",
      sequenceRandom([0, 1, 2, 3]),
    );
    const challenge = await createChallenge({
      type: "text",
      difficulty: "easy",
      secret: SECRET,
      store,
      random: paddedSequence([0, 1, 2, 3]),
    });
    return { token: challenge.token, answer: expected.answer };
  }

  it("verifies a valid answer and returns a proof token", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { POST } = createCaptchaHandlers({ store, secret: SECRET });
    const { token, answer } = await createTextChallenge();

    const response = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answer }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body).toEqual({ success: true, token: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain(answer);
    expect(JSON.stringify(body)).not.toContain(SECRET);
  });

  it("rejects an invalid answer", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { POST } = createCaptchaHandlers({ store, secret: SECRET });
    const { token } = await createTextChallenge();

    const response = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answer: "ZZZZ" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      success: false,
      error: "CAPTCHA_INVALID_ANSWER",
    });
  });

  it("supports proof verification and rejects reuse", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { POST } = createCaptchaHandlers({ store, secret: SECRET });
    const { token, answer } = await createTextChallenge();

    const verified = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answer }),
      }),
    );
    const proof = (await readJson(verified)).token as string;

    const ok = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: proof }),
      }),
    );
    expect(ok.status).toBe(200);
    expect(await readJson(ok)).toEqual({ success: true });

    const reuse = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: proof }),
      }),
    );
    expect(reuse.status).toBe(400);
    expect(await readJson(reuse)).toEqual({
      success: false,
      error: "CAPTCHA_ALREADY_USED",
    });
  });

  it("rejects malformed JSON and missing token", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { POST } = createCaptchaHandlers({ store, secret: SECRET });

    const badJson = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(badJson.status).toBe(400);

    const missingToken = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer: "1" }),
      }),
    );
    expect(await readJson(missingToken)).toEqual({
      success: false,
      error: "CAPTCHA_INVALID",
    });
  });

  it("rejects a consumed challenge on reuse", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { POST } = createCaptchaHandlers({ store, secret: SECRET });
    const { token, answer } = await createTextChallenge();

    await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answer }),
      }),
    );

    const again = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answer }),
      }),
    );
    expect(await readJson(again)).toEqual({
      success: false,
      error: "CAPTCHA_ALREADY_USED",
    });
  });

  it("never exposes secrets or stack traces on failure", async () => {
    store = new MemoryStore({ cleanupIntervalMs: 0 });
    const { GET, POST } = createCaptchaHandlers({
      store,
      secret: SECRET,
    });

    const challenge = await GET(new Request("http://localhost/api/captcha"));
    const text = await challenge.text();
    expect(text).not.toContain(SECRET);
    expect(text.toLowerCase()).not.toContain("stack");

    const fail = await POST(
      new Request("http://localhost/api/captcha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "nope", answer: "x" }),
      }),
    );
    const failText = await fail.text();
    expect(failText).not.toContain(SECRET);
    expect(failText.toLowerCase()).not.toContain("stack");
    expect(failText).not.toContain("ah");
  });
});
