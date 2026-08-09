import process from 'node:process';
import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set in the environment.');
    process.exit(2);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query('SELECT version() AS version, 1 AS ok');
    console.log('Connected:', result.rows[0]);
    console.log('SUCCESS: DB connectivity OK.');
  } catch (error) {
    console.error('DB connection FAILED:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main();
