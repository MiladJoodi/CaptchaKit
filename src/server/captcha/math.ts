import { formatDigits } from "../../shared/digits";
import type { Difficulty, Locale } from "../../shared/types";
import { secureRandom, type RandomSource } from "./random";
import type { DisplayChallenge } from "./types";

type Operator = "+" | "-" | "×" | "÷";

function chooseOperator(
  difficulty: Difficulty,
  random: RandomSource,
): Operator {
  if (difficulty === "easy") {
    return random.int(0, 1) === 0 ? "+" : "-";
  }
  if (difficulty === "medium") {
    const pick = random.int(0, 2);
    return pick === 0 ? "+" : pick === 1 ? "-" : "×";
  }
  const pick = random.int(0, 3);
  if (pick === 0) return "+";
  if (pick === 1) return "-";
  if (pick === 2) return "×";
  return "÷";
}

function operandRange(difficulty: Difficulty): { min: number; max: number } {
  switch (difficulty) {
    case "easy":
      return { min: 1, max: 9 };
    case "medium":
      return { min: 10, max: 99 };
    case "hard":
      return { min: 10, max: 99 };
  }
}

function randomOperand(
  min: number,
  max: number,
  random: RandomSource,
): number {
  return random.int(min, max);
}

export function generateMathChallenge(
  difficulty: Difficulty,
  locale: Locale,
  random: RandomSource = secureRandom,
): DisplayChallenge {
  const op = chooseOperator(difficulty, random);
  const range = operandRange(difficulty);

  let left: number;
  let right: number;
  let result: number;

  switch (op) {
    case "+": {
      left = randomOperand(range.min, range.max, random);
      right = randomOperand(range.min, range.max, random);
      result = left + right;
      break;
    }
    case "-": {
      left = randomOperand(range.min, range.max, random);
      right = randomOperand(range.min, left, random);
      result = left - right;
      break;
    }
    case "×": {
      if (difficulty === "medium") {
        left = randomOperand(2, 12, random);
        right = randomOperand(2, 12, random);
      } else {
        left = randomOperand(2, 20, random);
        right = randomOperand(2, 12, random);
      }
      result = left * right;
      break;
    }
    case "÷": {
      right = randomOperand(2, 12, random);
      const quotient = randomOperand(2, 12, random);
      left = right * quotient;
      result = quotient;
      break;
    }
  }

  const leftDisplay = formatDigits(left, locale);
  const rightDisplay = formatDigits(right, locale);
  const questionMark = locale === "fa" ? "؟" : "?";
  const display = `${leftDisplay} ${op} ${rightDisplay} = ${questionMark}`;

  return {
    answer: String(result),
    display,
  };
}
