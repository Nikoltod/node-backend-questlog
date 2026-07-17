import pg from "pg";

import { loadConfig } from "../config/config";

const { Pool } = pg;

export function createPool() {
  const config = loadConfig();

  return new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
  });
}