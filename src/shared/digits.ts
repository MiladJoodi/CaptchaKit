const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const ENGLISH_DIGITS = "0123456789";

/** Convert Persian / Arabic-Indic digits to English digits. */
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)));
}

/** Convert English digits to Persian digits. */
export function toPersianDigits(value: string): string {
  return value.replace(/[0-9]/g, (digit) => {
    const index = ENGLISH_DIGITS.indexOf(digit);
    return index === -1 ? digit : PERSIAN_DIGITS[index]!;
  });
}

/** Locale-aware digit display. */
export function formatDigits(value: string | number, locale: "en" | "fa"): string {
  const asString = String(value);
  return locale === "fa" ? toPersianDigits(asString) : asString;
}

export { PERSIAN_DIGITS, ARABIC_INDIC_DIGITS, ENGLISH_DIGITS };
