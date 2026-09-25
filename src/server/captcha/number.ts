import { formatDigits } from "../../shared/digits";
import type { Difficulty, Locale } from "../../shared/types";
import { pickChar, secureRandom, type RandomSource } from "./random";
import type { DisplayChallenge } from "./types";

const DIGITS = "0123456789";

function lengthForDifficulty(
  difficulty: Difficulty,
  random: RandomSource,
): number {
  switch (difficulty) {
    case "easy":
      return 4;
    case "medium":
      return random.int(5, 6);
    case "hard":
      return random.int(6, 7);
  }
}

export function generateNumberChallenge(
  difficulty: Difficulty,
  locale: Locale,
  random: RandomSource = secureRandom,
): DisplayChallenge {
  const length = lengthForDifficulty(difficulty, random);
  let answer = "";

  // First digit non-zero so length is meaningful.
  answer += pickChar(DIGITS.slice(1), random);
  for (let i = 1; i < length; i += 1) {
    answer += pickChar(DIGITS, random);
  }

  return {
    answer,
    display: formatDigits(answer, locale),
  };
}
