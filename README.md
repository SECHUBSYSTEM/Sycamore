# Sycamore

Idempotent wallet transfer and daily interest accumulator (Node.js, TypeScript, Express, Sequelize, PostgreSQL).

- **Part A:** `POST /transfer` with idempotency key and race-safe balance updates (Wallet, Ledger, TransactionLog).
- **Part B:** `POST /accumulate` for compound daily interest (27.5% p.a., leap-year aware, big.js precision).

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Docker (for PostgreSQL)

## Setup

1. **Clone and install**
   ```bash
   pnpm install
   ```

2. **Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` if needed (default: `postgres://postgres:postgres@localhost:54320/sycamore`).

3. **Start PostgreSQL**
   ```bash
   docker compose up -d
   ```

4. **Run migrations**
   ```bash
   pnpm run migrate
   ```
   If you see **"Connection terminated unexpectedly"**, the database may still be starting. Use:
   ```bash
   pnpm run migrate:wait
   ```
   (waits for Postgres to accept connections, then runs migrations)

5. **Seed demo data (optional, for Postman/testing)**
   ```bash
   pnpm run db:seed
   ```
   Creates two wallets: id 1 with 100.00 USD, id 2 with 0 USD. To reset DB and re-seed: `pnpm run migrate:undo` (repeat until no migrations left), then `pnpm run migrate` and `pnpm run db:seed`.

### Troubleshooting

- **Connection terminated unexpectedly** – Postgres in the container was not ready yet. Run `pnpm run migrate:wait` (recommended after `docker compose up -d`), or wait 5–10 seconds and run `pnpm run migrate` again.
- **Port 54320 already in use** – Change the host port in `docker-compose.yml` (e.g. `"54321:5432"`) and use the same port in `DATABASE_URL` in `.env`.
- **`password authentication failed for user "postgres"`** – Your `.env` must match the Postgres container: `DATABASE_URL=postgres://postgres:postgres@localhost:54320/sycamore`. If the container was created earlier with different env vars, remove the volume and recreate:
  ```bash
  docker compose down -v
  docker compose up -d
  pnpm run migrate
  ```

## Viewing the database (tables, data)

**Option 1: psql in the container**
```bash
docker compose exec postgres psql -U postgres -d sycamore -c "\dt"
```
Lists tables. To open an interactive shell: `docker compose exec postgres psql -U postgres -d sycamore`, then run `\dt` (tables), `\d "Wallets"` (table structure), `SELECT * FROM "Wallets";`, etc.

**Option 2: GUI client**  
Connect with:

| Field    | Value     |
|----------|-----------|
| Host     | localhost |
| Port     | 54320     |
| User     | postgres  |
| Password | postgres  |
| Database | sycamore  |

Use **pgAdmin**, **DBeaver**, **TablePlus**, or the **PostgreSQL** extension in VS Code (e.g. “PostgreSQL” by Chris Kolkman). Create a new connection with the values above; you can then browse tables (`Wallets`, `TransactionLogs`, `Ledgers`), run SQL, and view data.

## Run

- **Development:** `pnpm run dev`
- **Production:** `pnpm run build` then `pnpm start`

## Test

- **Unit tests:** `pnpm test`  
  Runs Jest unit tests: **bigint**, **errors**, **interest.service** (math + accumulateAndPersist with mocks), **transfer.service** (idempotency, PENDING, validation, wallet not found, insufficient balance, full transfer with mocks). No database required; `tests/jest.setup.js` sets `DATABASE_URL` if missing so the app modules load.
- **Coverage:** `pnpm run test:coverage`  
  Same as above and writes coverage to `coverage/` (text, lcov, html). Open `coverage/lcov-report/index.html` in a browser. Target: high statements/lines (e.g. >90%); models and routes are partially covered via service mocks.

### Coverage report

Run `pnpm run test:coverage` to regenerate. Example output:

| File | % Stmts | % Branch | % Funcs | % Lines |
|------|---------|----------|---------|---------|
| **All files** | 94.02 | 86.95 | 66.66 | 95.45 |
| errors/index.ts | 100 | 100 | 100 | 100 |
| models/ | 87.5 | 0 | 0 | 86.2 |
| services/interest.service.ts | 93.84 | 80 | 100 | 95.16 |
| services/transfer.service.ts | 94.23 | 92.59 | 100 | 98 |
| types/index.ts | 100 | 100 | 100 | 100 |
| utils/bigint.ts | 100 | 100 | 100 | 100 |
| utils/constants.ts | 100 | 100 | 100 | 100 |

Models (Ledger, TransactionLog, Wallet) show lower branch/func coverage because unit tests use mocks; the real model code is exercised at runtime. Services and utils are fully covered by unit tests.

**What’s tested:** `parseAmount`, `toBig`/`toBigInt`; interest daily rate (365/366), one-day and multi-day compound interest, edge cases (zero principal, fromDate > toDate); transfer: idempotency replay (same key → stored response), PENDING → 409, same-wallet validation, and unique-violation re-query (race).

---

## Requirements (Part A & B)

| Requirement | Implementation | Test coverage |
|-------------|----------------|---------------|
| **A: /transfer endpoint (Node.js, Sequelize)** | ✅ `POST /transfer` in `src/routes/transfer.routes.ts`, uses `transfer.service` and Sequelize models | ✅ Route exists; transfer service unit tests (mocked) cover idempotency, PENDING, validation |
| **A: Race conditions – no double-spend** | ✅ Wallet rows locked with `FOR UPDATE` in one transaction; idempotency key ensures repeat requests don’t run transfer again | ✅ Unit tests: replay returns stored response; unique violation path re-queries and returns 200 or 409. Full race is best verified by integration tests or manual Postman |
| **A: Idempotency key – double-tap doesn’t process twice** | ✅ Lookup by key → if SUCCESS return stored `responsePayload`; if PENDING return 409; else insert PENDING then do transfer | ✅ Unit tests: existing SUCCESS returns payload; existing PENDING throws `IdempotencyConflictError` |
| **A: TransactionLog with PENDING before main transaction** | ✅ Short transaction creates `TransactionLog` with status PENDING; main transaction runs afterward (see “How idempotency works”) | ✅ Described in README; unit tests mock the flow; integration test would assert DB state |
| **B: Daily interest 27.5% p.a.** | ✅ `interest.service`: `getDailyRate` (365/366), `calculateDailyInterest`, `compoundInterestForRange`; `POST /accumulate` persists via Sequelize | ✅ Jest unit tests for all math (see below) |
| **B: Math precision (no float errors)** | ✅ Big.js for interest; amounts as string/BIGINT in DB; `parseAmount` / `toBig` / `toBigInt` in `utils/bigint` | ✅ `bigint.test.ts`: parseAmount, toBig, toBigInt; `interest.service.test.ts`: exact comparisons with Big |
| **B: Sequelize for DB** | ✅ Wallets, TransactionLogs, Ledgers; `accumulateAndPersist` uses Wallet/Ledger and transactions | ✅ Math and transfer logic covered; `accumulateAndPersist` is integration-style (DB) – run with test DB or manual |
| **B: Jest unit tests – math accuracy and edge cases (e.g. leap years)** | ✅ `getDailyRate` 365 vs 366; `calculateDailyInterest` one day; `compoundInterestForRange` single day, zero days, multi-day compound | ✅ All covered in `interest.service.test.ts` and `bigint.test.ts` |

**Summary:** Implementation meets all of A and B. Part A is covered by transfer service unit tests (idempotency, PENDING, validation, unique-violation re-query); Part B math is fully covered by unit tests; the only parts not covered by unit tests are full HTTP/DB flows (e.g. `POST /transfer` with real DB, `accumulateAndPersist` with real DB), which are suited to integration tests.

## How idempotency works (transfer)

The **client** sends an idempotency key as a **valid UUID** (RFC 4122) so that repeating the same request doesn’t move money twice. Invalid format returns **400**.

1. **Resolve key** – Middleware reads `Idempotency-Key` header or body `idempotencyKey` and sets `req.idempotencyKey`. If missing, the route returns **400**. The route then validates the key with `uuid.validate()`; if not a valid UUID, **400**.
2. **Lookup** – Service looks up `TransactionLog` by that key:
   - If a row exists with status **SUCCESS**: return the stored **responsePayload** and respond **200** (same body as the first time). No DB write, no balance change.
   - If a row exists with status **PENDING**: another request is still processing → respond **409**. Client can retry later with the same key.
3. **Reserve the key** – If no row exists, insert a **PENDING** row in a short transaction (unique on `idempotencyKey`). If two requests race, only one insert wins; the other gets a unique violation, re-queries, then returns 200 or 409 as above.
4. **Do the transfer** – In a separate transaction: lock source wallet, check balance, create two **Ledger** rows (debit + credit), update both **Wallets**, set the **TransactionLog** to **SUCCESS** and store the response in `responsePayload`. That stored response is what we return for any future request with the same key.

So: **same key twice** → first request runs the transfer and returns 200; second request sees SUCCESS and returns 200 with the same body, without changing balances again.

**UUID:** We use the `uuid` package to validate the idempotency key. The client must send a valid UUID (e.g. v4); otherwise the API returns **400**. This keeps keys predictable and avoids malformed or duplicate-looking values.

---

## How the database fits together

- **Wallets** – One row per wallet: `id`, `balance` (smallest unit, e.g. cents), `currency`. Balances are updated on transfer and on interest accrual.
- **TransactionLogs** – One row per transfer *attempt*: `idempotencyKey` (unique), `status` (PENDING → SUCCESS or FAILED), transfer details, and `responsePayload` (the exact 200 response we replay for idempotency).
- **Ledgers** – Immutable audit: one row per debit or credit. Each transfer creates two rows (negative amount for source, positive for destination) with `type = 'TRANSFER'` and `transactionLogId` linking to the transfer. Interest creates rows with `type = 'INTEREST'` and a reference like `interest-YYYY-MM-DD`.

So: **Wallets** = current state; **Ledgers** = history of every change; **TransactionLogs** = idempotency and transfer lifecycle for `/transfer`.

---

## Architecture decisions and trade-offs

Summary of why I chose the current design and what I’d revisit at scale.

| Area | Decision | Rationale | Trade-off / at scale |
|------|----------|----------|----------------------|
| **Idempotency storage** | DB (`TransactionLogs` table) | Single store, no extra infra, ACID and durable. Fits current scope and low-to-moderate request volume. | **At scale:** Redis (or similar) with TTL is better for high TPS: sub-ms lookups, less DB load, natural key expiry. We’d keep DB as source of truth and use Redis as a cache for “seen key → response” to avoid hitting DB on every repeat. |
| **Transfer flow** | Lookup → PENDING insert (short tx) → main transfer tx | Clear separation: reserve key under unique constraint (handles races), then do money movement. Replay = one read, no double-spend. | Extra round-trips and two transactions per first-time request. Acceptable for now; at scale we might batch or optimize with a single tx and careful locking. |
| **Money representation** | Amounts as strings, stored as BIGINT (smallest unit) | Avoids float errors; strings in API allow exact decimals; BIGINT in DB is exact and index-friendly. | Callers must send well-formed numeric strings; we validate and parse (e.g. `parseAmount`). |
| **Interest math** | Big.js, one transaction per day | Exact decimal compound interest; leap-year aware (365/366). One short tx per day keeps locks minimal and logic simple. | Many days → many transactions. For very long ranges or batch jobs we might do batched updates or a single tx with multiple ledger rows (with care for lock duration). |
| **Currency** | Transfer multi-currency; interest USD only | Transfer is generic; interest uses a fixed annual rate and “USD only” keeps scope small and avoids FX. | Adding more currencies for interest would require rate source and possibly FX or multi-currency ledger design. |
| **No wallet-creation API** | Wallets created via seed or direct DB | Keeps API surface small; wallets are created once (or by an admin/back-office). | For a full product we’d add a dedicated wallet-creation or onboarding API and possibly soft-delete. |

---

## Testing with Postman (or any HTTP client)

**Quick path:** Run `pnpm run postman:ready` once (DB up + migrate + seed), then `pnpm run dev`. Seed creates wallets **id 1** (100.00 USD) and **id 2** (0 USD). Import the collection from `postman/Sycamore.postman_collection.json` and the environment from `postman/Sycamore.postman_environment.json`, select "Sycamore (local)", and use the requests.

**1. Start the app**

```bash
pnpm run db:up
pnpm run migrate:wait
pnpm run dev
```

Base URL: `http://localhost:4000` (default port from `PORT` in `.env`; see `.env.example`).

**2. Create two wallets (one-time)**  
Recommended: `pnpm run db:seed` (creates wallet id 1 and 2). Alternatively:

Either use a DB client (see “Viewing the database” above) or `pnpm run db:shell` and run:

```sql
INSERT INTO "Wallets" (balance, currency, "createdAt", "updatedAt") VALUES (10000, 'USD', NOW(), NOW());
INSERT INTO "Wallets" (balance, currency, "createdAt", "updatedAt") VALUES (0, 'USD', NOW(), NOW());
```

Then run `SELECT id, balance, currency FROM "Wallets";` and note the `id`s (e.g. 1 and 2).

**3. Test POST /transfer**

- **Method:** POST  
- **URL:** `http://localhost:4000/transfer`  
- **Headers:**  
  - `Content-Type: application/json`  
  - `Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000` (must be a valid UUID; use a new UUID for each new transfer)
- **Body (raw JSON):**
  ```json
  {
    "fromWalletId": 1,
    "toWalletId": 2,
    "amount": "3000"
  }
  ```
- Send. You should get **200** and a JSON body with `transactionLogId`, `fromWalletId`, `toWalletId`, `amount: "3000"`, `status: "SUCCESS"`, etc.
- **Idempotency check:** Send the **exact same request again** (same URL, body, and **same** `Idempotency-Key`). You should get **200** again with the **same** body. Balances do not change a second time. In the DB, `Wallets` still show one debit and one credit; `TransactionLogs` has one row for that key with status SUCCESS; `Ledgers` still has only the original two rows.

**4. Test POST /accumulate**

- **Method:** POST  
- **URL:** `http://localhost:4000/accumulate`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
  ```json
  {
    "walletId": 1,
    "fromDate": "2024-01-01",
    "toDate": "2024-01-07"
  }
  ```
- Send. You should get **200** with `totalInterest`, `daysProcessed`, etc. The wallet’s balance increases and new rows appear in **Ledgers** with `type = 'INTEREST'`.

**5. Inspect the DB**

Use your DB client or `pnpm run db:shell`:

- `SELECT * FROM "Wallets";` – current balances.
- `SELECT * FROM "TransactionLogs";` – each transfer (idempotency key, status, responsePayload).
- `SELECT * FROM "Ledgers" ORDER BY id;` – every debit/credit (transfer and interest).

---

## API (overview)

- **POST /transfer**  
  Body: `{ fromWalletId, toWalletId, amount (string), currency?, reference?, description? }`  
  Header: `Idempotency-Key: <valid UUID>` (or `idempotencyKey` in body). Invalid UUID returns 400.  
  Returns `200` with transfer details; same key returns same response (idempotent).

- **POST /accumulate**  
  Body: `{ walletId, fromDate (ISO), toDate (ISO) }`  
  Accrues compound daily interest (USD only) and persists to Ledger + Wallet.

## Is everything set up?

You’re set when:

- `pnpm install`, `.env` from `.env.example`, `pnpm run postman:ready` (or db:up + migrate + seed), and `pnpm run dev` all succeed.
- Postman collection and environment are imported, environment “Sycamore (local)” is selected, and **POST /transfer** and **POST /accumulate** return **200** with JSON (default app port **4000**).

## Next steps

- **Manual testing:** Use the Postman requests and optionally inspect DB (`pnpm run db:shell` or a GUI) to confirm balances and ledger rows.
- **Integration tests:** Add tests that run against a test DB (e.g. supertest + Jest) for full `/transfer` and `/accumulate` flows.
- **Wallet API:** If you need wallets created via API, add something like `POST /wallets` (and possibly list) with validation and auth as needed.
- **Scale / ops:** When moving toward production, consider idempotency cache (e.g. Redis), connection pooling, structured logging, and health/readiness endpoints.

## Implementation status

- **Done:** DB (Postgres on 54320), migrations (Wallets, TransactionLogs, Ledgers), models and associations, idempotent transfer (POST /transfer with Idempotency-Key), interest accumulator (POST /accumulate, compound daily, USD only), shared types and errors, unit tests (bigint, interest.service math, transfer.service idempotency/PENDING/validation/race), Jest coverage, seed script, Postman collection and environment (port 4000). TypeScript strict.
- **Not included:** Integration tests (e.g. full /transfer with DB), wallet-creation API.

## Project layout

- `src/config` – Sequelize instance
- `src/models` – Wallet, TransactionLog, Ledger
- `src/services` – transfer and interest logic
- `src/routes` – Express routes (call services)
- `src/utils` – `bigint` (parseAmount, toBig, toBigInt), `constants`
- `src/types` – shared enums and request/response types
- `src/errors` – IdempotencyConflictError, InsufficientBalanceError, ValidationError
- `tests/unit` – Jest unit tests (bigint, interest.service math)
- `migrations` – Sequelize migrations (Wallets → TransactionLogs → Ledgers)

