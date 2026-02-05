import Big from "big.js";
import { AMOUNT_SCALE } from "./constants";

/**
 * Parse amount from API (string only for precision). Rejects non-string, negative, zero, invalid.
 */
export function parseAmount(value: unknown): bigint {
  if (typeof value !== "string") {
    throw new Error(
      'Amount must be a string (e.g. "10000" for 100.00 in smallest unit)'
    );
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new Error("Amount is required");
  }
  let n: bigint;
  try {
    n = BigInt(trimmed);
  } catch {
    throw new Error("Amount must be a valid integer string");
  }
  if (n <= 0n) {
    throw new Error("Amount must be positive");
  }
  return n;
}

/**
 * Convert BigInt (smallest unit) to Big for decimal math. Uses AMOUNT_SCALE (e.g. 100 = cents).
 */
export function toBig(amountBigInt: bigint, scale: number = AMOUNT_SCALE): Big {
  return new Big(amountBigInt.toString()).div(scale);
}

/**
 * Convert Big back to BigInt (smallest unit), rounding down. Uses AMOUNT_SCALE.
 */
export function toBigInt(bigValue: Big, scale: number = AMOUNT_SCALE): bigint {
  return BigInt(bigValue.mul(scale).round(0, Big.roundDown).toString());
}
