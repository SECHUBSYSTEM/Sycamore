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
   Edit `.env` if needed (default: `postgres://postgres:postgres@localhost:5432/sycamore`).

3. **Start PostgreSQL**
   ```bash
   docker compose up -d
   ```

4. **Run migrations**
   ```bash
   pnpm run migrate
   ```

## Run

- **Development:** `pnpm run dev`
- **Production:** `pnpm run build` then `pnpm start`

## Test

- **Run tests:** `pnpm test`
- **With coverage:** `pnpm run test:coverage`

Use the same Postgres (e.g. Docker) for tests so BigInt and ENUMs match production.

## API (overview)

- **POST /transfer**  
  Body: `{ fromWalletId, toWalletId, amount (string), currency?, reference?, description? }`  
  Header: `Idempotency-Key: <uuid>` (or `idempotencyKey` in body).  
  Returns `200` with transfer details; same key returns same response (idempotent).

- **POST /accumulate**  
  Body: `{ walletId, fromDate (ISO), toDate (ISO) }`  
  Accrues compound daily interest (USD only) and persists to Ledger + Wallet.

## Project layout

- `src/config` – Sequelize instance
- `src/models` – Wallet, TransactionLog, Ledger
- `src/services` – transfer and interest logic
- `src/routes` – Express routes (call services)
- `src/utils` – `bigint` (parseAmount, toBig, toBigInt), `constants`
- `src/types` – shared enums and request/response types
- `migrations` – Sequelize migrations (Wallets → TransactionLogs → Ledgers)

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for full design.
