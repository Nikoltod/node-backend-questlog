import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { createPool } from "./database";

const migrationsDirectory = "labs/17-database-migrations/migrations";

async function ensureMigrationsTable() {
  const pool = createPool();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  } finally {
    await pool.end();
  }
}

async function getAppliedMigrations() {
  const pool = createPool();

  try {
    const result = await pool.query<{ filename: string }>(`
      SELECT filename
      FROM schema_migrations
      ORDER BY filename ASC;
    `);

    return new Set(result.rows.map((row) => row.filename));
  } finally {
    await pool.end();
  }
}

async function applyMigration(filename: string) {
  const pool = createPool();
  const filePath = join(migrationsDirectory, filename);
  const sql = await readFile(filePath, "utf8");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(sql);

    await client.query(
      `
        INSERT INTO schema_migrations (filename)
        VALUES ($1);
      `,
      [filename]
    );

    await client.query("COMMIT");

    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  await ensureMigrationsTable();

  const appliedMigrations = await getAppliedMigrations();

  const migrationFiles = await readdir(migrationsDirectory);
  const pendingMigrations = migrationFiles
    .filter((filename) => filename.endsWith(".sql"))
    .sort()
    .filter((filename) => !appliedMigrations.has(filename));

  if (pendingMigrations.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const filename of pendingMigrations) {
    await applyMigration(filename);
  }

  console.log("Migrations complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});