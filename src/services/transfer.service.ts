import { Transaction } from "sequelize";
import { TransactionLog, Wallet, Ledger, sequelize } from "../models";
import { TransactionLogStatus, LedgerType } from "../types";
import type { TransferResponsePayload } from "../types";
import {
  IdempotencyConflictError,
  InsufficientBalanceError,
  ValidationError,
} from "../errors";
import { DEFAULT_CURRENCY } from "../types";

export interface TransferParams {
  idempotencyKey: string;
  fromWalletId: number;
  toWalletId: number;
  amount: bigint;
  currency?: string;
  reference?: string | null;
  description?: string | null;
}

/**
 * Idempotent transfer: lookup first, then PENDING insert in short tx, then main transfer tx.
 * Returns stored response for replay; throws IdempotencyConflictError (409) or InsufficientBalanceError (422).
 */
export async function transfer(
  params: TransferParams
): Promise<TransferResponsePayload> {
  const {
    idempotencyKey,
    fromWalletId,
    toWalletId,
    amount,
    currency = DEFAULT_CURRENCY,
    reference = null,
    description = null,
  } = params;

  if (fromWalletId === toWalletId) {
    throw new ValidationError("fromWalletId and toWalletId must differ");
  }

  // 1) Lookup outside main transaction
  const existing = await TransactionLog.findOne({
    where: { idempotencyKey },
  });
  if (existing) {
    if (
      existing.status === TransactionLogStatus.SUCCESS &&
      existing.responsePayload
    ) {
      return existing.responsePayload as unknown as TransferResponsePayload;
    }
    if (existing.status === TransactionLogStatus.PENDING) {
      throw new IdempotencyConflictError();
    }
    // FAILED: allow retry by falling through to create new PENDING (or we could throw; plan says retry later with same key - so 409 for PENDING only)
  }

  // 2) Create PENDING row in a short transaction (unique constraint handles race)
  try {
    await sequelize.transaction(async (tx: Transaction) => {
      await TransactionLog.create(
        {
          idempotencyKey,
          status: TransactionLogStatus.PENDING,
          fromWalletId,
          toWalletId,
          amount: amount.toString(),
          currency,
          reference,
          description,
        },
        { transaction: tx }
      );
    });
  } catch (err: unknown) {
    const isUniqueViolation =
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name?: string }).name === "SequelizeUniqueConstraintError";
    if (isUniqueViolation) {
      const again = await TransactionLog.findOne({
        where: { idempotencyKey },
      });
      if (
        again?.status === TransactionLogStatus.SUCCESS &&
        again.responsePayload
      ) {
        return again.responsePayload as unknown as TransferResponsePayload;
      }
      throw new IdempotencyConflictError();
    }
    throw err;
  }

  // 3) Main transfer transaction
  const transactionLogId = await sequelize.transaction(
    async (tx: Transaction): Promise<number> => {
      const log = await TransactionLog.findOne({
        where: { idempotencyKey },
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      if (!log) throw new Error("TransactionLog PENDING row not found");

      const fromWallet = await Wallet.findByPk(fromWalletId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      const toWallet = await Wallet.findByPk(toWalletId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      if (!fromWallet || !toWallet) {
        await log.update(
          {
            status: TransactionLogStatus.FAILED,
            errorMessage: "Wallet not found",
          },
          { transaction: tx }
        );
        throw new ValidationError("One or both wallets not found");
      }

      const balanceFrom = fromWallet.getBalanceBigInt();
      if (balanceFrom < amount) {
        await log.update(
          {
            status: TransactionLogStatus.FAILED,
            errorMessage: "Insufficient balance",
          },
          { transaction: tx }
        );
        throw new InsufficientBalanceError();
      }

      const logId = log.id!;
      await Ledger.create(
        {
          walletId: fromWalletId,
          amount: (-amount).toString(),
          type: LedgerType.TRANSFER,
          reference: reference ?? undefined,
          transactionLogId: logId,
        },
        { transaction: tx }
      );
      await Ledger.create(
        {
          walletId: toWalletId,
          amount: amount.toString(),
          type: LedgerType.TRANSFER,
          reference: reference ?? undefined,
          transactionLogId: logId,
        },
        { transaction: tx }
      );

      const newFromBalance = balanceFrom - amount;
      const toBalance = toWallet.getBalanceBigInt();
      await fromWallet.update(
        { balance: newFromBalance.toString() },
        { transaction: tx }
      );
      await toWallet.update(
        { balance: (toBalance + amount).toString() },
        { transaction: tx }
      );

      const responsePayload: TransferResponsePayload = {
        transactionLogId: logId,
        fromWalletId,
        toWalletId,
        amount: amount.toString(),
        currency,
        status: "SUCCESS",
        createdAt: new Date().toISOString(),
      };
      await log.update(
        {
          status: TransactionLogStatus.SUCCESS,
          responsePayload: responsePayload as unknown as Record<
            string,
            unknown
          >,
          errorMessage: null,
        },
        { transaction: tx }
      );
      return logId;
    }
  );

  const log = await TransactionLog.findByPk(transactionLogId);
  const payload = log?.responsePayload as unknown as TransferResponsePayload;
  if (!payload) throw new Error("Missing responsePayload after transfer");
  return payload;
}
