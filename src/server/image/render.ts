/**
 * Image CAPTCHA renderer — pure SVG, no native modules.
 *
 * Works in Node.js and Edge. Never writes images to disk.
 */

import type { Difficulty, Locale } from "../../shared/types";
import { secureRandom, type RandomSource } from "../captcha/random";

export const CAPTCHA_IMAGE_WIDTH = 200;
export const CAPTCHA_IMAGE_HEIGHT = 52;

export interface RenderCaptchaImageOptions {
  /** Characters to paint (may include Persian digits for locale=fa). */
  text: string;
  difficulty: Difficulty;
  locale: Locale;
  random?: RandomSource;
  width?: number;
  height?: number;
}

interface DifficultyStyle {
  noiseDots: number;
  interferenceLines: number;
  maxRotationDeg: number;
  spacingJitter: number;
  fontSizeJitter: number;
  waveAmplitude: number;
  backgroundNoise: number;
}

function styleForDifficulty(difficulty: Difficulty): DifficultyStyle {
  switch (difficulty) {
    case "easy":
      return {
        noiseDots: 18,
        interferenceLines: 1,
        maxRotationDeg: 8,
        spacingJitter: 2,
        fontSizeJitter: 0,
        waveAmplitude: 0,
        backgroundNoise: 0.04,
      };
    case "medium":
      return {
        noiseDots: 55,
        interferenceLines: 3,
        maxRotationDeg: 18,
        spacingJitter: 5,
        fontSizeJitter: 3,
        waveAmplitude: 1.5,
        backgroundNoise: 0.08,
      };
    case "hard":
      return {
        noiseDots: 95,
        interferenceLines: 5,
        maxRotationDeg: 28,
        spacingJitter: 8,
        fontSizeJitter: 6,
        waveAmplitude: 3,
        backgroundNoise: 0.12,
      };
  }
}

function fontStack(locale: Locale): string {
  if (locale === "fa") {
    return "Segoe UI, Tahoma, Noto Sans, DejaVu Sans, Arial, sans-serif";
  }
  return "Segoe UI, Arial, DejaVu Sans, sans-serif";
}

function randomColor(
  random: RandomSource,
  min: number,
  max: number,
  alpha = 1,
): string {
  const r = random.int(min, max);
  const g = random.int(min, max);
  const b = random.int(min, max);
  if (alpha >= 1) {
    return `rgb(${r},${g},${b})`;
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render a CAPTCHA as an SVG markup string (no native dependencies).
 */
export function renderCaptchaImage(options: RenderCaptchaImageOptions): string {
  const width = options.width ?? CAPTCHA_IMAGE_WIDTH;
  const height = options.height ?? CAPTCHA_IMAGE_HEIGHT;
  const random = options.random ?? secureRandom;
  const style = styleForDifficulty(options.difficulty);
  const fontFamily = fontStack(options.locale);
  const svgParts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<rect width="100%" height="100%" fill="#f4f6f8"/>`,
  ];

  const grainCount = Math.floor(width * height * style.backgroundNoise);
  for (let i = 0; i < grainCount; i += 1) {
    const x = random.int(0, width - 1);
    const y = random.int(0, height - 1);
    svgParts.push(
      `<rect x="${x}" y="${y}" width="1" height="1" fill="${randomColor(random, 180, 230, 0.35)}"/>`,
    );
  }

  for (let i = 0; i < style.noiseDots; i += 1) {
    const x = random.int(0, width - 1);
    const y = random.int(0, height - 1);
    const radius = random.int(1, 2);
    svgParts.push(
      `<circle cx="${x}" cy="${y}" r="${radius}" fill="${randomColor(random, 90, 170, 0.45)}"/>`,
    );
  }

  for (let i = 0; i < style.interferenceLines; i += 1) {
    const x1 = random.int(0, width);
    const y1 = random.int(0, height);
    const cx1 = random.int(0, width);
    const cy1 = random.int(0, height);
    const cx2 = random.int(0, width);
    const cy2 = random.int(0, height);
    const x2 = random.int(0, width);
    const y2 = random.int(0, height);
    const stroke = randomColor(random, 100, 180, 0.55);
    const strokeWidth = random.int(1, 2);
    svgParts.push(
      `<path d="M${x1} ${y1} C${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
    );
  }

  const chars = [...options.text];
  const baseFontSize = 26;
  const totalWidthEstimate = chars.length * (baseFontSize * 0.62);
  let cursorX = Math.max(12, (width - totalWidthEstimate) / 2);
  const baselineY = height / 2;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]!;
    const fontSize =
      baseFontSize +
      (style.fontSizeJitter === 0
        ? 0
        : random.int(-style.fontSizeJitter, style.fontSizeJitter));
    const rotationDeg =
      style.maxRotationDeg === 0
        ? 0
        : random.int(-style.maxRotationDeg, style.maxRotationDeg);
    const yJitter =
      style.waveAmplitude === 0
        ? random.int(-2, 2)
        : random.int(
            -Math.ceil(style.waveAmplitude * 3),
            Math.ceil(style.waveAmplitude * 3),
          );
    const wave =
      style.waveAmplitude === 0
        ? 0
        : Math.sin((i / Math.max(chars.length - 1, 1)) * Math.PI * 2) *
          style.waveAmplitude;
    const y = baselineY + yJitter + wave;
    const fill = randomColor(random, 20, 70);
    svgParts.push(
      `<text x="${cursorX.toFixed(1)}" y="${y.toFixed(1)}" fill="${fill}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotationDeg} ${cursorX.toFixed(1)} ${y.toFixed(1)})">${escapeXml(ch)}</text>`,
    );

    const advance =
      fontSize * 0.58 +
      (style.spacingJitter === 0
        ? 2
        : random.int(1, style.spacingJitter + 1));
    cursorX += advance;
  }

  if (options.difficulty !== "easy") {
    const speckles = options.difficulty === "hard" ? 40 : 18;
    for (let i = 0; i < speckles; i += 1) {
      svgParts.push(
        `<rect x="${random.int(0, width - 1)}" y="${random.int(0, height - 1)}" width="1" height="1" fill="${randomColor(random, 60, 140, 0.35)}"/>`,
      );
    }
  }

  svgParts.push(`</svg>`);
  return svgParts.join("");
}

/** Encode SVG markup as a data URL suitable for `<img src>`. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
