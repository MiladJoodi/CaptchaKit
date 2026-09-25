/**
 * Image CAPTCHA challenge generator.
 *
 * Pure SVG — no native modules. Reuses text character rules and
 * shared answer normalization — does not duplicate security logic.
 */

import { toPersianDigits } from "../../shared/digits";
import type { Difficulty, Locale } from "../../shared/types";
import {
  CAPTCHA_IMAGE_HEIGHT,
  CAPTCHA_IMAGE_WIDTH,
  renderCaptchaImage,
  svgToDataUrl,
} from "../image/render";
import { secureRandom, type RandomSource } from "./random";
import { generateTextChallenge } from "./text";
import type { ImageChallenge } from "./types";

export { CAPTCHA_IMAGE_WIDTH, CAPTCHA_IMAGE_HEIGHT };

/**
 * Generate an image CAPTCHA.
 * `answer` is for hashing only; callers must never return it to clients.
 * Visual output is `image` (SVG data URL).
 */
export function generateImageChallenge(
  difficulty: Difficulty,
  locale: Locale,
  random: RandomSource = secureRandom,
): ImageChallenge {
  // Same character rules as text CAPTCHA (length, alphabet, ambiguous exclusion).
  const { answer } = generateTextChallenge(difficulty, locale, random);

  // For fa, render digits as Persian glyphs; answer stays Latin for hashing.
  const renderText = locale === "fa" ? toPersianDigits(answer) : answer;

  const svg = renderCaptchaImage({
    text: renderText,
    difficulty,
    locale,
    random,
  });

  return {
    answer,
    image: svgToDataUrl(svg),
  };
}
