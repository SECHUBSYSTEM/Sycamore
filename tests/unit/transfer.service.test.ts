import { transfer, TransferParams } from "../../src/services/transfer.service";
import { TransactionLogStatus } from "../../src/types";
import type { TransferResponsePayload } from "../../src/types";
import {
  IdempotencyConflictError,
  InsufficientBalanceError,
  ValidationError,
} from "../../src/errors";

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockFindByPk = jest.fn();
const mockTransaction = jest.fn();
const mockWalletFindByPk = jest.fn();
const mockLedgerCreate = jest.fn();

const mockTx = { LOCK: { UPDATE: "FOR UPDATE" } };

jest.mock("../../src/models", () => ({
  TransactionLog: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
  },
  Wallet: { findByPk: (...args: unknown[]) => mockWalletFindByPk(...args), update: jest.fn() },
  Ledger: { create: (...args: unknown[]) => mockLedgerCreate(...args) },
  sequelize: {
    transaction: (cb: (tx: unknown) => Promise<unknown>) => mockTransaction(cb),
  },
}));

const baseParams: TransferParams = {
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  fromWalletId: 1,
  toWalletId: 2,
  amount: 3000n,
};

const storedPayload: TransferResponsePayload = {
  transactionLogId: 1,
  fromWalletId: 1,
  toWalletId: 2,
  amount: "3000",
  currency: "USD",
  status: "SUCCESS",
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("transfer", () => {
  it("throws ValidationError when fromWalletId and toWalletId are the same", async () => {
    await expect(
      transfer({ ...baseParams, fromWalletId: 1, toWalletId: 1 })
    ).rejects.toThrow(ValidationError);
    await expect(
      transfer({ ...baseParams, fromWalletId: 1, toWalletId: 1 })
    ).rejects.toThrow("fromWalletId and toWalletId must differ");
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("returns stored response when existing TransactionLog has SUCCESS and responsePayload (idempotency replay)", async () => {
    mockFindOne.mockResolvedValue({
      status: TransactionLogStatus.SUCCESS,
      responsePayload: storedPayload,
    });

    const result = await transfer(baseParams);

    expect(result).toEqual(storedPayload);
    expect(mockFindOne).toHaveBeenCalledWith({ where: { idempotencyKey: baseParams.idempotencyKey } });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("throws IdempotencyConflictError when existing TransactionLog has PENDING", async () => {
    mockFindOne.mockResolvedValue({
      status: TransactionLogStatus.PENDING,
      responsePayload: null,
    });

    await expect(transfer(baseParams)).rejects.toThrow(IdempotencyConflictError);
    expect(mockFindOne).toHaveBeenCalledWith({ where: { idempotencyKey: baseParams.idempotencyKey } });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("on unique constraint violation re-queries and returns stored response when other request already succeeded", async () => {
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        status: TransactionLogStatus.SUCCESS,
        responsePayload: storedPayload,
      });
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      await cb({});
    });
    mockCreate.mockRejectedValueOnce({ name: "SequelizeUniqueConstraintError" });

    const result = await transfer(baseParams);

    expect(result).toEqual(storedPayload);
    expect(mockFindOne).toHaveBeenCalledTimes(2);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("on unique constraint violation re-queries and throws IdempotencyConflictError when other request still PENDING", async () => {
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        status: TransactionLogStatus.PENDING,
        responsePayload: null,
      });
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      await cb({});
    });
    mockCreate.mockRejectedValueOnce({ name: "SequelizeUniqueConstraintError" });

    await expect(transfer(baseParams)).rejects.toThrow(IdempotencyConflictError);
    expect(mockFindOne).toHaveBeenCalledTimes(2);
  });

  it("performs full transfer and returns payload when PENDING insert then main tx succeed", async () => {
    const mockLogUpdate = jest.fn().mockResolvedValue(undefined);
    const fromWallet = {
      getBalanceBigInt: () => 10000n,
      update: jest.fn().mockResolvedValue(undefined),
    };
    const toWallet = {
      getBalanceBigInt: () => 0n,
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, update: mockLogUpdate });
    mockCreate.mockResolvedValue(undefined);
    mockWalletFindByPk.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? fromWallet : toWallet)
    );
    mockLedgerCreate.mockResolvedValue(undefined);
    mockFindByPk.mockResolvedValue({ responsePayload: storedPayload });

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return await cb(mockTx);
    });

    const result = await transfer(baseParams);

    expect(result).toEqual(storedPayload);
    expect(mockFindOne).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockFindByPk).toHaveBeenCalledWith(1);
  });

  it("throws ValidationError when wallet not found (fromWallet missing)", async () => {
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 1,
        update: jest.fn().mockResolvedValue(undefined),
      });
    mockCreate.mockResolvedValue(undefined);
    mockWalletFindByPk.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? null : { getBalanceBigInt: () => 0n, update: jest.fn() })
    );
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return await cb(mockTx);
    });

    const err = await transfer(baseParams).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as Error).message).toBe("One or both wallets not found");
  });

  it("throws InsufficientBalanceError when source balance too low", async () => {
    const fromWallet = {
      getBalanceBigInt: () => 100n,
      update: jest.fn(),
    };
    const toWallet = {
      getBalanceBigInt: () => 0n,
      update: jest.fn(),
    };

    mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 1,
      update: jest.fn().mockResolvedValue(undefined),
    });
    mockCreate.mockResolvedValue(undefined);
    mockWalletFindByPk.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? fromWallet : toWallet)
    );

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      await cb(mockTx);
    });

    await expect(transfer(baseParams)).rejects.toThrow(InsufficientBalanceError);
  });
});
