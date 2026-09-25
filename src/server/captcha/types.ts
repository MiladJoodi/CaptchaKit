import type { Difficulty, Locale } from "../../shared/types";
import type { RandomSource } from "./random";

/** Text / number / math generation result. */
export interface DisplayChallenge {
  answer: string;
  display: string;
}

/** Image generation result (SVG data URL). */
export interface ImageChallenge {
  answer: string;
  image: string;
}

/**
 * Internal generation result.
 * `answer` is for hashing only — never returned to clients.
 */
export type GeneratedChallenge = DisplayChallenge | ImageChallenge;

export type ChallengeGenerator = (
  difficulty: Difficulty,
  locale: Locale,
  random?: RandomSource,
) => GeneratedChallenge;
