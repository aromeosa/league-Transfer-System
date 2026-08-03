import * as dotenv from 'dotenv';
import * as path from 'path';

// Loaded first (before any src/ module, particularly config/data-source.ts, reads
// process.env) so the e2e suite runs against transfer_system_test, not the dev DB.
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

import { Client } from 'pg';
import { DataSource } from 'typeorm';

export async function ensureTestDatabaseExists(): Promise<void> {
  const dbName = process.env.DB_NAME ?? 'transfer_system_test';
  const admin = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USERNAME ?? 'transfer_system',
    password: process.env.DB_PASSWORD ?? 'transfer_system',
    database: 'postgres',
  });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end();
  }
}

/** Drops and recreates every table so each e2e run starts from a clean, migrated schema. */
export async function resetAndMigrate(): Promise<void> {
  // Imported lazily, after dotenv.config() above has already set process.env.
  const { dataSourceOptions } = await import('../src/config/data-source');
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  await dataSource.destroy();
}
