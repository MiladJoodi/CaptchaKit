import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CAPTCHA_TYPE,
  DEFAULT_DIFFICULTY,
  DEFAULT_ENDPOINT,
  DEFAULT_LOCALE,
} from "../shared/constants";
import { isCaptchaErrorCode } from "../shared/errors";
import type {
  CaptchaChallengeDisplay,
  CaptchaErrorCode,
  CaptchaType,
  CreateChallengeResult,
  Difficulty,
  Locale,
  VerifyCaptchaResult,
} from "../shared/types";

export interface UseCaptchaOptions {
  type?: CaptchaType;
  locale?: Locale;
  difficulty?: Difficulty;
  endpoint?: string;
  disabled?: boolean;
  onVerify?: (token: string) => void;
  onError?: (error: CaptchaErrorCode) => void;
}

export type CaptchaStatus =
  | "idle"
  | "loading"
  | "ready"
  | "verifying"
  | "verified"
  | "error";

export interface UseCaptchaResult {
  status: CaptchaStatus;
  challengeType: CaptchaType | null;
  challenge: CaptchaChallengeDisplay | null;
  challengeToken: string | null;
  answer: string;
  setAnswer: (value: string) => void;
  errorCode: CaptchaErrorCode | null;
  verified: boolean;
  refresh: () => Promise<void>;
  submit: () => Promise<void>;
  isBusy: boolean;
}

function buildChallengeUrl(
  endpoint: string,
  type: CaptchaType,
  locale: Locale,
  difficulty: Difficulty,
): string {
  const url = new URL(
    endpoint,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  url.searchParams.set("type", type);
  url.searchParams.set("locale", locale);
  url.searchParams.set("difficulty", difficulty);
  // Prefer relative path when endpoint is absolute-path style.
  if (endpoint.startsWith("/")) {
    return `${endpoint}?${url.searchParams.toString()}`;
  }
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asErrorCode(value: unknown): CaptchaErrorCode {
  if (isCaptchaErrorCode(value)) return value;
  return "CAPTCHA_INVALID";
}

/**
 * Internal hook: fetches challenges and posts answers over HTTP.
 * Never verifies answers locally — the server is authoritative.
 */
export function useCaptcha(options: UseCaptchaOptions = {}): UseCaptchaResult {
  const type = options.type ?? DEFAULT_CAPTCHA_TYPE;
  const locale = options.locale ?? DEFAULT_LOCALE;
  const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY;
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const disabled = options.disabled ?? false;

  const onVerifyRef = useRef(options.onVerify);
  const onErrorRef = useRef(options.onError);
  onVerifyRef.current = options.onVerify;
  onErrorRef.current = options.onError;

  const [status, setStatus] = useState<CaptchaStatus>("idle");
  const [challengeType, setChallengeType] = useState<CaptchaType | null>(null);
  const [challenge, setChallenge] = useState<CaptchaChallengeDisplay | null>(
    null,
  );
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [errorCode, setErrorCode] = useState<CaptchaErrorCode | null>(null);
  const [verified, setVerified] = useState(false);

  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const emitError = useCallback((code: CaptchaErrorCode) => {
    setErrorCode(code);
    setStatus("error");
    onErrorRef.current?.(code);
  }, []);

  const fetchChallenge = useCallback(async () => {
    if (disabled) return;

    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setStatus("loading");
    setErrorCode(null);
    setAnswer("");
    setVerified(false);
    setChallenge(null);
    setChallengeToken(null);
    setChallengeType(null);

    try {
      const response = await fetch(
        buildChallengeUrl(endpoint, type, locale, difficulty),
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );

      const body = (await readJson(response)) as
        | CreateChallengeResult
        | { success?: false; error?: unknown }
        | null;

      if (requestId !== requestIdRef.current) return;

      if (!response.ok || !body || !("token" in body) || !body.token) {
        const code =
          body && "error" in body
            ? asErrorCode(body.error)
            : ("CAPTCHA_INVALID" as const);
        emitError(code);
        return;
      }

      setChallengeToken(body.token);
      setChallengeType(body.type);
      setChallenge(body.challenge);
      setStatus("ready");
    } catch {
      if (requestId !== requestIdRef.current) return;
      emitError("CAPTCHA_INVALID");
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
      }
    }
  }, [disabled, endpoint, type, locale, difficulty, emitError]);

  useEffect(() => {
    void fetchChallenge();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchChallenge]);

  const refresh = useCallback(async () => {
    if (disabled || inFlightRef.current) return;
    await fetchChallenge();
  }, [disabled, fetchChallenge]);

  const submit = useCallback(async () => {
    if (disabled || verified || inFlightRef.current) return;
    if (!challengeToken || !answer.trim()) return;

    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setStatus("verifying");
    setErrorCode(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: challengeToken,
          answer,
        }),
      });

      const body = (await readJson(response)) as VerifyCaptchaResult | null;

      if (requestId !== requestIdRef.current) return;

      if (!body || typeof body !== "object") {
        emitError("CAPTCHA_INVALID");
        return;
      }

      if (body.success === true && body.token) {
        setVerified(true);
        setStatus("verified");
        setErrorCode(null);
        onVerifyRef.current?.(body.token);
        return;
      }

      if (body.success === false) {
        const code = asErrorCode(body.error);
        // Clear input on wrong answer so the user can retry.
        if (code === "CAPTCHA_INVALID_ANSWER") {
          setAnswer("");
        }
        // Exhausted / expired / used → force a fresh challenge next refresh.
        if (
          code === "CAPTCHA_EXPIRED" ||
          code === "CAPTCHA_ALREADY_USED" ||
          code === "CAPTCHA_MAX_ATTEMPTS"
        ) {
          setChallengeToken(null);
          setChallenge(null);
        }
        emitError(code);
        return;
      }

      emitError("CAPTCHA_INVALID");
    } catch {
      if (requestId !== requestIdRef.current) return;
      emitError("CAPTCHA_INVALID");
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
        setStatus((current) =>
          current === "verifying" ? "ready" : current,
        );
      }
    }
  }, [
    disabled,
    verified,
    challengeToken,
    answer,
    endpoint,
    emitError,
  ]);

  const isBusy =
    status === "loading" || status === "verifying" || inFlightRef.current;

  return {
    status,
    challengeType,
    challenge,
    challengeToken,
    answer,
    setAnswer,
    errorCode,
    verified,
    refresh,
    submit,
    isBusy,
  };
}
