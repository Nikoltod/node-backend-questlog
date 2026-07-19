import { Pool } from "pg";
import { config } from "./config";

export const databasePool = new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 2_0000,
});

export async function checkDatabaseReadiness(): Promise<void> {
    await databasePool.query("SELECT 1");
};