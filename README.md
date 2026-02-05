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

