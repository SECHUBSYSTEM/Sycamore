import Big from "big.js";
import {
  getDailyRate,
  calculateDailyInterest,
  compoundInterestForRange,
} from "../../src/services/interest.service";
import { startOfDay, parseISO } from "date-fns";

describe("getDailyRate", () => {
  it("uses 365 for non-leap year", () => {
    const rate = getDailyRate(parseISO("2023-06-15"));
    expect(rate.toString()).toBe(new Big("0.275").div(365).toString());
  });

  it("uses 366 for leap year", () => {
    const rate = getDailyRate(parseISO("2024-02-29"));
    expect(rate.toString()).toBe(new Big("0.275").div(366).toString());
  });
});

describe("calculateDailyInterest", () => {
  it("computes one day interest (non-leap): principal * 0.275/365", () => {
    const principal = 10000n; // 100.00 in cents
    const date = parseISO("2023-07-01");
    const interest = calculateDailyInterest(principal, date);
    const expected = new Big("100").mul(new Big("0.275").div(365));
    expect(interest.toString()).toBe(expected.toString());
  });

  it("computes one day interest (leap year): principal * 0.275/366", () => {
    const principal = 10000n;
    const date = parseISO("2024-02-29");
    const interest = calculateDailyInterest(principal, date);
    const expected = new Big("100").mul(new Big("0.275").div(366));
    expect(interest.toString()).toBe(expected.toString());
  });

  it("returns zero for zero principal", () => {
    const interest = calculateDailyInterest(0n, parseISO("2023-07-01"));
    expect(interest.toString()).toBe("0");
  });
});

describe("compoundInterestForRange", () => {
  it("single day: fromDate = toDate", () => {
    const principal = 10000n;
    const date = parseISO("2023-07-01");
    const { totalInterest, finalPrincipal } = compoundInterestForRange(
      principal,
      date,
      date
    );
    const oneDay = calculateDailyInterest(principal, date);
    expect(totalInterest.toString()).toBe(oneDay.toString());
    expect(finalPrincipal.toString()).toBe(
      new Big("100").add(oneDay).toString()
    );
  });

  it("zero days: fromDate after toDate returns zero interest", () => {
    const { totalInterest, finalPrincipal } = compoundInterestForRange(
      10000n,
      parseISO("2023-07-02"),
      parseISO("2023-07-01")
    );
    expect(totalInterest.toString()).toBe("0");
    expect(finalPrincipal.toString()).toBe("100");
  });

  it("multiple days compounds correctly", () => {
    const principal = 10000n; // 100.00
    const from = parseISO("2023-07-01");
    const to = parseISO("2023-07-03");
    const { totalInterest, finalPrincipal } = compoundInterestForRange(
      principal,
      from,
      to
    );
    let p = new Big("100");
    let total = new Big(0);
    for (const d of [from, parseISO("2023-07-02"), to]) {
      const r = new Big("0.275").div(365);
      const i = p.mul(r);
      total = total.add(i);
      p = p.add(i);
    }
    expect(totalInterest.toString()).toBe(total.toString());
    expect(finalPrincipal.toString()).toBe(p.toString());
  });
});
