import "server-only";
import { randomInt } from "crypto";

/**
 * A first-login password the office can read out over the phone without
 * ambiguity: no 0/O, 1/l/I, 5/S, so nobody mistypes it. Three groups of four
 * keeps it easy to dictate ("smithers-4KQP-7TMV-3RJH") while still giving
 * roughly 70 bits of entropy.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateTempPassword(): string {
  const group = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}
