'use strict';

require('dotenv').config();
const { execSync } = require('child_process');

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.error('DATABASE_URL must be set (e.g. postgres://user:pass@host:port/dbname)');
  process.exit(1);
}

async function tryConnect() {
  const pg = require('pg');
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 2000,
  });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const maxAttempts = 30;
const delayMs = 1000;

(async () => {
  for (let i = 0; i < maxAttempts; i++) {
    if (await tryConnect()) {
      console.log('Database is ready.');
      execSync('sequelize-cli db:migrate', { stdio: 'inherit' });
      process.exit(0);
    }
    console.log(`Waiting for database... (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error('Database did not become ready in time.');
  process.exit(1);
})();
