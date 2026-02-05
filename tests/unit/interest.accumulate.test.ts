import { parseISO } from "date-fns";
import { accumulateAndPersist } from "../../src/services/interest.service";
import { ValidationError } from "../../src/errors";

const mockWalletFindByPk = jest.fn();
const mockLedgerCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../../src/models", () => ({
  Wallet: { findByPk: (...args: unknown[]) => mockWalletFindByPk(...args), update: jest.fn() },
  Ledger: { create: (...args: unknown[]) => mockLedgerCreate(...args) },
  sequelize: {
    transaction: (cb: (tx: unknown) => Promise<unknown>) => mockTransaction(cb),
  },
  TransactionLog: {},
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("accumulateAndPersist", () => {
  it("throws ValidationError when fromDate is after toDate", async () => {
    await expect(
      accumulateAndPersist(1, parseISO("2024-01-02"), parseISO("2024-01-01"))
    ).rejects.toThrow(ValidationError);
    await expect(
      accumulateAndPersist(1, parseISO("2024-01-02"), parseISO("2024-01-01"))
    ).rejects.toThrow("fromDate must be <= toDate");
    expect(mockWalletFindByPk).not.toHaveBeenCalled();
  });

  it("throws ValidationError when wallet not found", async () => {
    mockWalletFindByPk.mockResolvedValue(null);

    await expect(
      accumulateAndPersist(1, parseISO("2024-01-01"), parseISO("2024-01-01"))
    ).rejects.toThrow(ValidationError);
    await expect(
      accumulateAndPersist(1, parseISO("2024-01-01"), parseISO("2024-01-01"))
    ).rejects.toThrow("Wallet not found");
  });

  it("throws ValidationError when wallet currency is not USD", async () => {
    mockWalletFindByPk.mockResolvedValue({
      currency: "EUR",
      getBalanceBigInt: () => 10000n,
    });

    await expect(
      accumulateAndPersist(1, parseISO("2024-01-01"), parseISO("2024-01-01"))
    ).rejects.toThrow(ValidationError);
    await expect(
      accumulateAndPersist(1, parseISO("2024-01-01"), parseISO("2024-01-01"))
    ).rejects.toThrow("Interest is only supported for USD wallets");
  });

  it("processes one day and returns totalInterest and daysProcessed", async () => {
    const wallet = {
      currency: "USD",
      getBalanceBigInt: () => 10000n,
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockWalletFindByPk.mockResolvedValue(wallet);
    mockLedgerCreate.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      await cb({ LOCK: { UPDATE: "FOR UPDATE" } });
    });

    const result = await accumulateAndPersist(
      1,
      parseISO("2024-01-01"),
      parseISO("2024-01-01")
    );

    expect(result.daysProcessed).toBe(1);
    expect(Number(result.totalInterest)).toBeGreaterThan(0);
    expect(mockLedgerCreate).toHaveBeenCalled();
    expect(wallet.update).toHaveBeenCalled();
  });
});
