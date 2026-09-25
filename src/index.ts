/**
 * CaptchaKit root entry — client-safe only.
 * Re-exports the client package surface. Never imports server modules.
 */

export {
  Captcha,
  CAPTCHA_ERROR_CODES,
  CAPTCHA_ERROR_CODE_LIST,
  isCaptchaErrorCode,
  DEFAULT_CAPTCHA_TYPE,
  DEFAULT_LOCALE,
  DEFAULT_DIFFICULTY,
  DEFAULT_THEME,
  DEFAULT_ENDPOINT,
  CAPTCHA_TYPES,
  LOCALES,
  DIFFICULTIES,
  THEMES,
} from "./client/index";

export type {
  CaptchaType,
  Locale,
  Difficulty,
  Theme,
  CaptchaErrorCode,
  CaptchaClassNames,
  CaptchaChallengeDisplay,
  CaptchaProps,
  CreateChallengeOptions,
  CreateChallengeResult,
  VerifyCaptchaOptions,
  VerifyCaptchaSuccess,
  VerifyCaptchaFailure,
  VerifyCaptchaResult,
} from "./client/index";
