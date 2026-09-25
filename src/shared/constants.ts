import type { CaptchaType, Difficulty, Locale, Theme } from "./types";

/** Default challenge type when none is specified. */
export const DEFAULT_CAPTCHA_TYPE: CaptchaType = "math";

/** Default locale when none is specified. */
export const DEFAULT_LOCALE: Locale = "en";

/** Default difficulty when none is specified. */
export const DEFAULT_DIFFICULTY: Difficulty = "medium";

/** Default UI theme when none is specified. */
export const DEFAULT_THEME: Theme = "light";

/** Default HTTP endpoint used by the Captcha client component. */
export const DEFAULT_ENDPOINT = "/api/captcha";

/** Supported CAPTCHA types (runtime list). */
export const CAPTCHA_TYPES = [
  "text",
  "number",
  "math",
  "image",
] as const satisfies ReadonlyArray<CaptchaType>;

/** Supported locales (runtime list). */
export const LOCALES = ["en", "fa"] as const satisfies ReadonlyArray<Locale>;

/** Supported difficulty levels (runtime list). */
export const DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
] as const satisfies ReadonlyArray<Difficulty>;

/** Supported themes (runtime list). */
export const THEMES = ["light", "dark"] as const satisfies ReadonlyArray<Theme>;
