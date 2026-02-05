import Big from "big.js";
import { isLeapYear, addDays, isAfter, startOfDay } from "date-fns";
import { Wallet, Ledger, sequelize } from "../models";
import { LedgerType } from "../types";
import { INTEREST_RATE_ANNUAL } from "../utils/constants";
import { toBig, toBigInt } from "../utils/bigint";
import { ValidationError } from "../errors";

const RATE = new Big(INTEREST_RATE_ANNUAL);

/** Daily rate for a given date (366 in leap years, 365 otherwise). */
export function getDailyRate(date: Date): Big {
  const daysInYear = isLeapYear(date) ? 366 : 365;
  return RATE.div(daysInYear);
}

/** Interest for one day (compound input = principal for that day). */
export function calculateDailyInterest(
  principalBigInt: bigint,
  date: Date
): Big {
  const principal = toBig(principalBigInt);
  const dailyRate = getDailyRate(date);
  return principal.mul(dailyRate);
}

/** Compound interest over [fromDate, toDate] (inclusive). No DB. */
export function compoundInterestForRange(
  principalBigInt: bigint,
  fromDate: Date,
  toDate: Date
): { totalInterest: Big; finalPrincipal: Big } {
  let principal = toBig(principalBigInt);
  let totalInterest = new Big(0);
  let current = startOfDay(fromDate);
  const end = startOfDay(toDate);
  if (isAfter(current, end)) {
    return { totalInterest: new Big(0), finalPrincipal: principal };
  }
  while (true) {
    const dailyRate = getDailyRate(current);
    const interest = principal.mul(dailyRate);
    totalInterest = totalInterest.add(interest);
    principal = principal.add(interest);
    if (current.getTime() >= end.getTime()) break;
    current = addDays(current, 1);
  }
  return { totalInterest, finalPrincipal: principal };
}

export interface AccumulateResult {
  totalInterest: string;
  daysProcessed: number;
}

/** Persist daily compound interest; one short transaction per day. Currency must be USD. */
export async function accumulateAndPersist(
  walletId: number,
  fromDate: Date,
  toDate: Date
): Promise<AccumulateResult> {
  const start = startOfDay(fromDate);
  const end = startOfDay(toDate);
  if (isAfter(start, end)) {
    throw new ValidationError("fromDate must be <= toDate");
  }

  const wallet = await Wallet.findByPk(walletId);
  if (!wallet) {
    throw new ValidationError("Wallet not found");
  }
  if (wallet.currency !== "USD") {
    throw new ValidationError("Interest is only supported for USD wallets");
  }

  let totalInterest = new Big(0);
  let daysProcessed = 0;
  let current = start;

  while (true) {
    await sequelize.transaction(async (tx) => {
      const w = await Wallet.findByPk(walletId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      if (!w) throw new ValidationError("Wallet not found");
      const principalBigInt = w.getBalanceBigInt();
      const interest = calculateDailyInterest(principalBigInt, current);
      const interestRounded = toBigInt(interest);
      if (interestRounded <= 0n) {
        daysProcessed += 1;
        return;
      }
      const ref = `interest-${current.toISOString().slice(0, 10)}`;
      await Ledger.create(
        {
          walletId,
          amount: interestRounded.toString(),
          type: LedgerType.INTEREST,
          reference: ref,
          transactionLogId: null,
        },
        { transaction: tx }
      );
      const newBalance = principalBigInt + interestRounded;
      await w.update({ balance: newBalance.toString() }, { transaction: tx });
      totalInterest = totalInterest.add(interest);
      daysProcessed += 1;
    });

    if (current.getTime() >= end.getTime()) break;
    current = addDays(current, 1);
  }

  return {
    totalInterest: totalInterest.toString(),
    daysProcessed,
  };
}
