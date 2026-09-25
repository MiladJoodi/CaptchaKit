/**
 * Client-safe CaptchaKit entry.
 *
 * Public API: `<Captcha />` plus shared types/constants/errors.
 * Internal hooks/subcomponents are not exported.
 */

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
  CAPTCHA_ERROR_CODES,
  CAPTCHA_ERROR_CODE_LIST,
  isCaptchaErrorCode,
} from "../shared/errors";

export { Captcha } from "./Captcha";
