import {
  CAPTCHA_TYPES,
  DEFAULT_CAPTCHA_TYPE,
  DEFAULT_DIFFICULTY,
  DEFAULT_LOCALE,
  DIFFICULTIES,
  LOCALES,
} from "../shared/constants";
import type {
  CaptchaErrorCode,
  CaptchaType,
  Difficulty,
  Locale,
} from "../shared/types";
import { createChallenge } from "./createChallenge";
import { CaptchaError, isCaptchaError } from "./security/errors";
import type { CaptchaStore } from "./security/store";
import { verifyCaptcha } from "./verifyCaptcha";

export type CaptchaHandler = (
  request: Request,
) => Promise<Response> | Response;

export interface CreateCaptchaHandlersOptions {
  /**
   * Derive a rate-limit identifier from the request (e.g. client IP).
   * Default: best-effort IP from common proxy headers, else `"anonymous"`.
   *
   * Prefer configuring this behind a trusted reverse proxy. Headers such as
   * `x-forwarded-for` are only as trustworthy as your proxy setup.
   */
  getIdentifier?: (request: Request) => string;
  /** Optional store override (defaults to process-local MemoryStore). */
  store?: CaptchaStore;
  /** Optional secret override (defaults to CAPTCHAKIT_SECRET). */
  secret?: string;
}

export interface CaptchaHandlers {
  GET: CaptchaHandler;
  POST: CaptchaHandler;
}

function json(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function errorResponse(error: CaptchaErrorCode, status: number): Response {
  return json({ success: false, error }, status);
}

function statusForError(code: CaptchaErrorCode): number {
  switch (code) {
    case "CAPTCHA_RATE_LIMITED":
      return 429;
    case "CAPTCHA_MISSING_SECRET":
      return 500;
    default:
      return 400;
  }
}

function isCaptchaType(value: string): value is CaptchaType {
  return (CAPTCHA_TYPES as readonly string[]).includes(value);
}

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

/**
 * Best-effort client identifier for rate limiting.
 * Does not persist the value; used only as a short-lived rate-limit key.
 */
export function defaultGetIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "anonymous";
}

function parseQueryParams(url: URL):
  | { ok: true; type: CaptchaType; locale: Locale; difficulty: Difficulty }
  | { ok: false; error: CaptchaErrorCode } {
  const typeParam = url.searchParams.get("type") ?? DEFAULT_CAPTCHA_TYPE;
  const localeParam = url.searchParams.get("locale") ?? DEFAULT_LOCALE;
  const difficultyParam =
    url.searchParams.get("difficulty") ?? DEFAULT_DIFFICULTY;

  if (!isCaptchaType(typeParam)) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }
  if (!isLocale(localeParam)) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }
  if (!isDifficulty(difficultyParam)) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  return {
    ok: true,
    type: typeParam,
    locale: localeParam,
    difficulty: difficultyParam,
  };
}

/**
 * Create Web-standard GET/POST handlers for `/api/captcha`.
 * Compatible with Next.js App Router Route Handlers (no Next.js dependency).
 *
 * Status codes (kept simple):
 * - 200 success
 * - 400 client/validation/CAPTCHA failures
 * - 429 rate limited
 * - 500 missing/invalid server secret
 */
export function createCaptchaHandlers(
  options: CreateCaptchaHandlersOptions = {},
): CaptchaHandlers {
  const getIdentifier = options.getIdentifier ?? defaultGetIdentifier;
  const store = options.store;
  const secret = options.secret;

  const GET: CaptchaHandler = async (request) => {
    try {
      const url = new URL(request.url);
      const parsed = parseQueryParams(url);
      if (!parsed.ok) {
        return errorResponse(parsed.error, statusForError(parsed.error));
      }

      const identifier = getIdentifier(request);
      const challenge = await createChallenge({
        type: parsed.type,
        locale: parsed.locale,
        difficulty: parsed.difficulty,
        identifier,
        ...(store ? { store } : {}),
        ...(secret ? { secret } : {}),
      });

      return json(challenge, 200);
    } catch (error) {
      if (isCaptchaError(error)) {
        return errorResponse(error.code, statusForError(error.code));
      }
      return errorResponse("CAPTCHA_INVALID", 400);
    }
  };

  const POST: CaptchaHandler = async (request) => {
    try {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse("CAPTCHA_INVALID", 400);
      }

      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return errorResponse("CAPTCHA_INVALID", 400);
      }

      const record = body as Record<string, unknown>;
      const token = record.token;
      const answer = record.answer;

      if (typeof token !== "string" || token.length === 0) {
        return errorResponse("CAPTCHA_INVALID", 400);
      }

      if (answer !== undefined && typeof answer !== "string") {
        return errorResponse("CAPTCHA_INVALID", 400);
      }

      const result = await verifyCaptcha({
        token,
        ...(typeof answer === "string" ? { answer } : {}),
        ...(store ? { store } : {}),
        ...(secret ? { secret } : {}),
      });

      if (!result.success) {
        return errorResponse(result.error, statusForError(result.error));
      }

      // Challenge verify returns a proof token; proof verify returns success only.
      if (result.token) {
        return json({ success: true, token: result.token }, 200);
      }
      return json({ success: true }, 200);
    } catch (error) {
      if (error instanceof CaptchaError) {
        return errorResponse(error.code, statusForError(error.code));
      }
      return errorResponse("CAPTCHA_INVALID", 400);
    }
  };

  return { GET, POST };
}
