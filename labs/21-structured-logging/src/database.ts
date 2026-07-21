import type { FastifyBaseLogger } from "fastify";
import { Pool } from "pg";

import { config } from "./config.js";

export const databasePool = new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 2_000,
});

let databasePoolClosed = false;
let poolErrorHandlerRegistered = false;

export function registerDatabasePoolErrorHandler(
    logger: FastifyBaseLogger,
): void {
    if (poolErrorHandlerRegistered) {
        return;
    }

    poolErrorHandlerRegistered = true;

    databasePool.on("error", (error) => {
        logger.error(
            {
                err: error,
                component: "postgres",
            },
            "Unexpected error from an idle PostgreSQL client",
        );
    });
}

export async function checkDatabaseReadiness(): Promise<void> {
    await databasePool.query("SELECT 1");
}

export async function getDatabaseTime(): Promise<string> {
    const result = await databasePool.query<{
        database_time: Date;
    }>(
        `
      SELECT NOW() AS database_time
    `,
    );

    const databaseTime = result.rows[0]?.database_time;

    if (!databaseTime) {
        throw new Error(
            "PostgreSQL did not return the current database time",
        );
    }

    return databaseTime.toISOString();
}

export async function closeDatabasePool(): Promise<void> {
    if (databasePoolClosed) {
        return;
    }

    databasePoolClosed = true;

    await databasePool.end();
}