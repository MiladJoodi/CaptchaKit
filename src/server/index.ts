/**
 * Server-only CaptchaKit entry.
 *
 * Public surface for application servers / Next.js Route Handlers.
 * Do not import this module from client bundles.
 */

export type {
  CaptchaType,
  Locale,
  Difficulty,
  Theme,
  CaptchaErrorCode,
  CaptchaChallengeDisplay,
  CaptchaClassNames,
  CaptchaProps,
  CreateChallengeOptions,
  CreateChallengeResult,
  VerifyCaptchaOptions,
  VerifyCaptchaSuccess,
  VerifyCaptchaFailure,
  VerifyCaptchaResult,
} from "../shared/types";

export {
  DEFAULT_CAPTCHA_TYPE,
  DEFAULT_LOCALE,
  DEFAULT_DIFFICULTY,
  DEFAULT_THEME,
  DEFAULT_ENDPOINT,
  CAPTCHA_TYPES,
  LOCALES,
  DIFFICULTIES,
  THEMES,
} from "../shared/constants";

export {
  CHALLENGE_TTL_MS,
  PROOF_TTL_MS,
  MAX_ATTEMPTS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  SECRET_ENV_KEY,
  SECRET_MIN_LENGTH,
} from "../shared/server-constants";

export {
  CAPTCHA_ERROR_CODES,
  CAPTCHA_ERROR_CODE_LIST,
  isCaptchaErrorCode,
} from "../shared/errors";

export { CaptchaError, isCaptchaError } from "./security/errors";
export { getSecret, isValidSecret } from "./security/secret";
export type { SecretEnv } from "./security/secret";

export type {
  CaptchaStore,
  ChallengeRecord,
  ProofRecord,
  IncrementAttemptsResult,
} from "./security/store";
export { MemoryStore } from "./security/memory";
export type { MemoryStoreOptions } from "./security/memory";
export { getDefaultStore, setDefaultStore } from "./security/defaultStore";

export { createChallenge } from "./createChallenge";
export type { CreateChallengeServerOptions } from "./createChallenge";
export { verifyCaptcha } from "./verifyCaptcha";
export type { VerifyCaptchaServerOptions } from "./verifyCaptcha";

export { createCaptchaHandlers, defaultGetIdentifier } from "./handlers";
export type {
  CreateCaptchaHandlersOptions,
  CaptchaHandlers,
  CaptchaHandler,
} from "./handlers";
