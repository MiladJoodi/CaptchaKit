import { createHmac, timingSafeEqual } from "node:crypto";

export function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodePayload(encoded: string): unknown {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
}

export function signEncodedPayload(encoded: string, secret: string): string {
  return createHmac("sha256", secret).update(encoded, "utf8").digest("base64url");
}

export function buildToken(encodedPayload: string, secret: string): string {
  const signature = signEncodedPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function splitToken(
  token: string,
): { encoded: string; signature: string } | null {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) {
    return null;
  }

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!encoded || !signature) {
    return null;
  }

  return { encoded, signature };
}

export function verifySignature(
  encoded: string,
  signature: string,
  secret: string,
): boolean {
  const expected = signEncodedPayload(encoded, secret);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }

  return timingSafeEqual(a, b);
}
