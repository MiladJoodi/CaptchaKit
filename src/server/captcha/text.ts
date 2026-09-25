import type { Difficulty, Locale } from "../../shared/types";
import { pickChar, secureRandom, type RandomSource } from "./random";
import type { DisplayChallenge } from "./types";

/** Ambiguous characters excluded from text CAPTCHAs. */
export const AMBIGUOUS_CHARS = new Set(["O", "0", "I", "1", "l"]);

const UPPER_DIGITS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const MIXED = UPPER_DIGITS + LOWER;

function lengthForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case "easy":
      return 4;
    case "medium":
      return 5;
    case "hard":
      return 6;
  }
}

function alphabetForDifficulty(difficulty: Difficulty): string {
  return difficulty === "hard" ? MIXED : UPPER_DIGITS;
}

export function generateTextChallenge(
  difficulty: Difficulty,
  _locale: Locale,
  random: RandomSource = secureRandom,
): DisplayChallenge {
  const length = lengthForDifficulty(difficulty);
  const alphabet = alphabetForDifficulty(difficulty);
  let answer = "";

  for (let i = 0; i < length; i += 1) {
    const ch = pickChar(alphabet, random);
    if (AMBIGUOUS_CHARS.has(ch)) {
      // Alphabet is pre-filtered; this is a defensive guard.
      i -= 1;
      continue;
    }
    answer += ch;
  }

  return { answer, display: answer };
}

export function assertNoAmbiguousChars(value: string): boolean {
  for (const ch of value) {
    if (AMBIGUOUS_CHARS.has(ch)) return false;
  }
  return true;
}
