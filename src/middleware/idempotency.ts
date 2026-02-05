import { Request, Response, NextFunction } from "express";

const IDEMPOTENCY_HEADER = "idempotency-key";
const BODY_KEY = "idempotencyKey";

export function resolveIdempotencyKey(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const fromHeader = req.get(IDEMPOTENCY_HEADER);
  const fromBody =
    req.body &&
    typeof req.body === "object" &&
    typeof (req.body as Record<string, unknown>)[BODY_KEY] === "string"
      ? ((req.body as Record<string, unknown>)[BODY_KEY] as string).trim()
      : undefined;
  req.idempotencyKey = (fromHeader ?? fromBody)?.trim() || undefined;
  next();
}
