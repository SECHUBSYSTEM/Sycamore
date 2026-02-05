/**
 * Shared enums and request/response types (DRY, type-safe).
 */

/** TransactionLog status - use SUCCESS for completed transfers */
export const TransactionLogStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;
export type TransactionLogStatusType =
  (typeof TransactionLogStatus)[keyof typeof TransactionLogStatus];

/** Ledger entry type */
export const LedgerType = {
  TRANSFER: "TRANSFER",
  INTEREST: "INTEREST",
  OTHER: "OTHER",
} as const;
export type LedgerTypeValue = (typeof LedgerType)[keyof typeof LedgerType];

/** Default currency when not specified */
export const DEFAULT_CURRENCY = "USD" as const;

/** Transfer request body (amount must be string for precision) */
export interface TransferRequestBody {
  fromWalletId: number;
  toWalletId: number;
  amount: string;
  currency?: string;
  reference?: string;
  description?: string;
  idempotencyKey?: string;
}

/** Transfer success response (stored in responsePayload for idempotent replay) */
export interface TransferResponsePayload {
  transactionLogId: number;
  fromWalletId: number;
  toWalletId: number;
  amount: string;
  currency: string;
  status: "SUCCESS";
  createdAt: string;
}

/** Interest accumulate request body */
export interface AccumulateRequestBody {
  walletId: number;
  fromDate: string; // ISO date
  toDate: string;
}
