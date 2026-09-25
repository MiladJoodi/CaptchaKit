/**
 * Supported CAPTCHA challenge kinds.
 */
export type CaptchaType = "text" | "number" | "math" | "image";

/**
 * UI and challenge locale.
 */
export type Locale = "en" | "fa";

/**
 * Challenge difficulty level.
 */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * Visual theme for the Captcha component.
 */
export type Theme = "light" | "dark";

/**
 * Stable error codes returned by CaptchaKit server APIs.
 */
export type CaptchaErrorCode =
  | "CAPTCHA_EXPIRED"
  | "CAPTCHA_INVALID"
  | "CAPTCHA_ALREADY_USED"
  | "CAPTCHA_MAX_ATTEMPTS"
  | "CAPTCHA_RATE_LIMITED"
  | "CAPTCHA_INVALID_ANSWER"
  | "CAPTCHA_MISSING_SECRET";

/**
 * Public className slots for styling the Captcha UI.
 */
export interface CaptchaClassNames {
  container?: string;
  challenge?: string;
  input?: string;
  button?: string;
  error?: string;
}

/**
 * Display payload returned with a challenge (never includes the answer).
 *
 * - text / number / math → `{ display }`
 * - image → `{ image }` (SVG data URL)
 */
export interface CaptchaChallengeDisplay {
  /** Human-readable challenge for text / number / math types. */
  display?: string;
  /** SVG data URL for image type. */
  image?: string;
}

/**
 * Options used when creating a challenge (server API).
 */
export interface CreateChallengeOptions {
  type?: CaptchaType;
  difficulty?: Difficulty;
  locale?: Locale;
  /** Optional rate-limit identifier (e.g. client IP). */
  identifier?: string;
}

/**
 * Successful challenge creation result.
 */
export interface CreateChallengeResult {
  token: string;
  type: CaptchaType;
  challenge: CaptchaChallengeDisplay;
  expiresAt: number;
}

/**
 * Options for verifying a CAPTCHA (server API, later phases).
 *
 * - Challenge verification: provide `token` + `answer`
 * - Proof verification: provide proof `token` only
 */
export interface VerifyCaptchaOptions {
  token: string;
  answer?: string;
}

/**
 * Successful verification result.
 */
export interface VerifyCaptchaSuccess {
  success: true;
  /** Proof token issued after a correct challenge answer. */
  token?: string;
}

/**
 * Failed verification result.
 */
export interface VerifyCaptchaFailure {
  success: false;
  error: CaptchaErrorCode;
}

export type VerifyCaptchaResult = VerifyCaptchaSuccess | VerifyCaptchaFailure;

/**
 * Props for the public `<Captcha />` component (implemented in a later phase).
 */
export interface CaptchaProps {
  type?: CaptchaType;
  locale?: Locale;
  difficulty?: Difficulty;
  theme?: Theme;
  /** API endpoint for challenge/verify requests. Default: `/api/captcha` */
  endpoint?: string;
  classNames?: CaptchaClassNames;
  onVerify?: (token: string) => void;
  onError?: (error: CaptchaErrorCode) => void;
  disabled?: boolean;
}
