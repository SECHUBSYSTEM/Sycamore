import { Router, Request, Response } from "express";
import { accumulateAndPersist } from "../services/interest.service";
import { parseISO, isValid } from "date-fns";
import type { AccumulateRequestBody } from "../types";
import { ValidationError } from "../errors";

const router: ReturnType<typeof Router> = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as AccumulateRequestBody;
    const { walletId, fromDate: fromStr, toDate: toStr } = body;

    if (typeof walletId !== "number" || walletId <= 0) {
      res
        .status(400)
        .json({ error: "Valid walletId (positive number) is required" });
      return;
    }
    if (typeof fromStr !== "string" || typeof toStr !== "string") {
      res
        .status(400)
        .json({ error: "fromDate and toDate (ISO strings) are required" });
      return;
    }

    const fromDate = parseISO(fromStr);
    const toDate = parseISO(toStr);
    if (!isValid(fromDate) || !isValid(toDate)) {
      res.status(400).json({ error: "Invalid fromDate or toDate" });
      return;
    }

    const result = await accumulateAndPersist(walletId, fromDate, toDate);
    res.status(200).json({
      walletId,
      fromDate: fromStr,
      toDate: toStr,
      totalInterest: result.totalInterest,
      daysProcessed: result.daysProcessed,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("Accumulate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const interestRoutes: ReturnType<typeof Router> = router;
