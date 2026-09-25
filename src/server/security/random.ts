import { randomBytes } from "node:crypto";

/** Cryptographically secure opaque ID (base64url). */
export function createId(byteLength = 16): string {
  return randomBytes(byteLength).toString("base64url");
}
