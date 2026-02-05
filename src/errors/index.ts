export class IdempotencyConflictError extends Error {
  readonly statusCode = 409;
  constructor(message = "Idempotency key already in use") {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

export class InsufficientBalanceError extends Error {
  readonly statusCode = 422;
  constructor(message = "Insufficient balance") {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
