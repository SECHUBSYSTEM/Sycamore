import { Router, Request, Response } from "express";
import { validate as validateUuid } from "uuid";
import { transfer } from "../services/transfer.service";
import { resolveIdempotencyKey } from "../middleware/idempotency";
import { parseAmount } from "../utils/bigint";
import { DEFAULT_CURRENCY } from "../types";
import type { TransferRequestBody } from "../types";
import {
  IdempotencyConflictError,
  InsufficientBalanceError,
  ValidationError,
} from "../errors";

const router: ReturnType<typeof Router> = Router();

router.post(
  "/",
  resolveIdempotencyKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const key = req.idempotencyKey;
      if (!key || key.length === 0) {
        res.status(400).json({
          error: "Idempotency-Key header or idempotencyKey in body is required",
        });
        return;
      }
      if (!validateUuid(key)) {
        res.status(400).json({
          error: "Idempotency-Key must be a valid UUID (e.g. RFC 4122)",
        });
        return;
      }

      const body = req.body as TransferRequestBody;
      const {
        fromWalletId,
        toWalletId,
        amount: amountRaw,
        currency,
        reference,
        description,
      } = body;

      if (
        typeof fromWalletId !== "number" ||
        typeof toWalletId !== "number" ||
        fromWalletId <= 0 ||
        toWalletId <= 0
      ) {
        res.status(400).json({
          error:
            "Valid fromWalletId and toWalletId (positive numbers) are required",
        });
        return;
      }

      let amountBigInt: bigint;
      try {
        amountBigInt = parseAmount(amountRaw);
      } catch (e) {
        res
          .status(400)
          .json({ error: e instanceof Error ? e.message : "Invalid amount" });
        return;
      }

      const result = await transfer({
        idempotencyKey: key,
        fromWalletId,
        toWalletId,
        amount: amountBigInt,
        currency: currency ?? DEFAULT_CURRENCY,
        reference: reference ?? null,
        description: description ?? null,
      });

      res.status(200).json(result);
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        res.status(409).json({ error: err.message });
        return;
      }
      if (err instanceof InsufficientBalanceError) {
        res.status(422).json({ error: err.message });
        return;
      }
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("Transfer error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const transferRoutes: ReturnType<typeof Router> = router;
