import {
  IdempotencyConflictError,
  InsufficientBalanceError,
  ValidationError,
} from "../../src/errors";

describe("errors", () => {
  it("IdempotencyConflictError has statusCode 409 and default message", () => {
    const err = new IdempotencyConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Idempotency key already in use");
    expect(err.name).toBe("IdempotencyConflictError");
  });

  it("InsufficientBalanceError has statusCode 422 and default message", () => {
    const err = new InsufficientBalanceError();
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Insufficient balance");
    expect(err.name).toBe("InsufficientBalanceError");
  });

  it("ValidationError has statusCode 400 and custom message", () => {
    const err = new ValidationError("Invalid amount");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid amount");
    expect(err.name).toBe("ValidationError");
  });
});
