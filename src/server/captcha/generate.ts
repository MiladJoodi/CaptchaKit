import type { CaptchaType, Difficulty, Locale } from "../../shared/types";
import { CaptchaError } from "../security/errors";
import { generateImageChallenge } from "./image";
import { generateMathChallenge } from "./math";
import { generateNumberChallenge } from "./number";
import type { RandomSource } from "./random";
import { generateTextChallenge } from "./text";
import type { GeneratedChallenge } from "./types";

/**
 * Generate challenge content for the requested CAPTCHA type.
 */
export function generateChallengeContent(
  type: CaptchaType,
  difficulty: Difficulty,
  locale: Locale,
  random?: RandomSource,
): GeneratedChallenge {
  switch (type) {
    case "text":
      return generateTextChallenge(difficulty, locale, random);
    case "number":
      return generateNumberChallenge(difficulty, locale, random);
    case "math":
      return generateMathChallenge(difficulty, locale, random);
    case "image":
      return generateImageChallenge(difficulty, locale, random);
    default:
      throw new CaptchaError("CAPTCHA_INVALID");
  }
}
