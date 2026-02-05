import { parseAmount, toBig, toBigInt } from "../../src/utils/bigint";
import { AMOUNT_SCALE } from "../../src/utils/constants";

describe("parseAmount", () => {
  it("accepts valid positive integer string", () => {
    expect(parseAmount("10000")).toBe(10000n);
    expect(parseAmount("1")).toBe(1n);
  });

  it("rejects non-string", () => {
    expect(() => parseAmount(10000)).toThrow("Amount must be a string");
    expect(() => parseAmount(null)).toThrow("Amount must be a string");
    expect(() => parseAmount(undefined)).toThrow("Amount must be a string");
  });

  it("rejects empty or whitespace string", () => {
    expect(() => parseAmount("")).toThrow("Amount is required");
    expect(() => parseAmount("   ")).toThrow("Amount is required");
  });

  it("rejects invalid integer string", () => {
    expect(() => parseAmount("12.34")).toThrow("valid integer");
    expect(() => parseAmount("abc")).toThrow("valid integer");
  });

  it("rejects zero or negative", () => {
    expect(() => parseAmount("0")).toThrow("Amount must be positive");
    expect(() => parseAmount("-100")).toThrow("Amount must be positive");
  });

  it("accepts large string (precision safe)", () => {
    const big = "9007199254740993";
    expect(parseAmount(big)).toBe(BigInt(big));
  });
});

describe("toBig / toBigInt", () => {
  it("toBig converts BigInt to Big with scale", () => {
    const b = toBig(10000n);
    expect(b.toString()).toBe("100");
    expect(toBig(1n, 1).toString()).toBe("1");
  });

  it("toBigInt converts Big back to BigInt (round down)", () => {
    const Big = require("big.js").default;
    expect(toBigInt(new Big("100.99"))).toBe(10099n);
    expect(toBigInt(new Big("0.01"))).toBe(1n);
    expect(toBigInt(new Big("0.009"))).toBe(0n);
  });

  it("round-trip preserves value for integer amounts", () => {
    const amount = 12345n;
    expect(toBigInt(toBig(amount))).toBe(amount);
  });
});
