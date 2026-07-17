import pg from "pg";

const { Pool } = pg;

export function createPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5433),
    user: process.env.POSTGRES_USER ?? "questlog",
    password: process.env.POSTGRES_PASSWORD ?? "questlog",
    database: process.env.POSTGRES_DB ?? "questlog",
  });
}