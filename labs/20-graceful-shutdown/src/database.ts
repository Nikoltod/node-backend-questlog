import type { FastifyBaseLogger } from "fastify";
import { Pool } from "pg";

import { config } from "./config.js";

export const databasePool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 2_000,
});

let databasePoolClosed = false;

export function registerDatabasePoolErrorHandler(
  logger: FastifyBaseLogger,
): void {
  databasePool.on("error", (error) => {
    logger.error(
      {
        err: error,
      },
      "Unexpected error from an idle PostgreSQL client",
    );
  });
}

export async function checkDatabaseReadiness(): Promise<void> {
  await databasePool.query("SELECT 1");
}

export async function closeDatabasePool(): Promise<void> {
  if (databasePoolClosed) {
    return;
  }

  databasePoolClosed = true;

  await databasePool.end();
}