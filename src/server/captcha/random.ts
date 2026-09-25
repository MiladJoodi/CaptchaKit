import { randomInt } from "node:crypto";

/** Inclusive cryptographically secure integer in [min, max]. */
export type RandomSource = {
  int(minInclusive: number, maxInclusive: number): number;
};

export const secureRandom: RandomSource = {
  int(minInclusive, maxInclusive) {
    if (maxInclusive < minInclusive) {
      throw new RangeError("maxInclusive must be >= minInclusive");
    }
    return randomInt(minInclusive, maxInclusive + 1);
  },
};

export function pickIndex(length: number, random: RandomSource = secureRandom): number {
  return random.int(0, length - 1);
}

export function pickChar(alphabet: string, random: RandomSource = secureRandom): string {
  return alphabet[pickIndex(alphabet.length, random)]!;
}
