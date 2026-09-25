import type { CaptchaErrorCode, Locale } from "../shared/types";
import { toPersianDigits } from "../shared/digits";

export interface CaptchaMessages {
  loading: string;
  refresh: string;
  inputLabel: string;
  submit: string;
  retry: string;
  verified: string;
  imageAlt: string;
  challengeLabel: string;
  errors: Record<CaptchaErrorCode, string>;
}

const en: CaptchaMessages = {
  loading: "Loading…",
  refresh: "Refresh CAPTCHA",
  inputLabel: "CAPTCHA answer",
  submit: "Verify",
  retry: "Try again",
  verified: "Verified",
  imageAlt: "CAPTCHA challenge image",
  challengeLabel: "CAPTCHA challenge",
  errors: {
    CAPTCHA_EXPIRED: "This CAPTCHA has expired. Please try again.",
    CAPTCHA_INVALID: "This CAPTCHA is invalid. Please try again.",
    CAPTCHA_ALREADY_USED: "This CAPTCHA has already been used.",
    CAPTCHA_MAX_ATTEMPTS: "Too many attempts. Please get a new CAPTCHA.",
    CAPTCHA_RATE_LIMITED: "Too many requests. Please try again later.",
    CAPTCHA_INVALID_ANSWER: "The answer is incorrect.",
    CAPTCHA_MISSING_SECRET: "CAPTCHA configuration is unavailable.",
  },
};

const fa: CaptchaMessages = {
  loading: "در حال بارگذاری…",
  refresh: "بارگذاری مجدد کپچا",
  inputLabel: "پاسخ کپچا",
  submit: "تأیید",
  retry: "تلاش مجدد",
  verified: "تأیید شد",
  imageAlt: "تصویر چالش کپچا",
  challengeLabel: "چالش کپچا",
  errors: {
    CAPTCHA_EXPIRED: "این کپچا منقضی شده است. لطفاً دوباره تلاش کنید.",
    CAPTCHA_INVALID: "این کپچا نامعتبر است. لطفاً دوباره تلاش کنید.",
    CAPTCHA_ALREADY_USED: "این کپچا قبلاً استفاده شده است.",
    CAPTCHA_MAX_ATTEMPTS: "تعداد تلاش‌ها بیش از حد است. لطفاً کپچای جدید بگیرید.",
    CAPTCHA_RATE_LIMITED: "درخواست‌ها بیش از حد است. لطفاً بعداً تلاش کنید.",
    CAPTCHA_INVALID_ANSWER: "پاسخ نادرست است.",
    CAPTCHA_MISSING_SECRET: "پیکربندی کپچا در دسترس نیست.",
  },
};

const dictionaries: Record<Locale, CaptchaMessages> = { en, fa };

export function getMessages(locale: Locale): CaptchaMessages {
  return dictionaries[locale] ?? dictionaries.en;
}

export function getErrorMessage(
  locale: Locale,
  code: CaptchaErrorCode,
): string {
  return getMessages(locale).errors[code];
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "fa" ? "rtl" : "ltr";
}

/** Format a count for display in the active locale (UI only). */
export function formatUiNumber(value: number, locale: Locale): string {
  const asString = String(value);
  return locale === "fa" ? toPersianDigits(asString) : asString;
}
