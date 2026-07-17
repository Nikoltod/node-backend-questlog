import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDirectory, "../../.env");

loadDotenv({
  path: envPath,
});

type AppConfig = {
  nodeEnv: string;
  port: number;
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
};

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function numberFromEnv(name: string) {
  const value = required(name);
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: numberFromEnv("PORT"),
    postgres: {
      host: required("POSTGRES_HOST"),
      port: numberFromEnv("POSTGRES_PORT"),
      user: required("POSTGRES_USER"),
      password: required("POSTGRES_PASSWORD"),
      database: required("POSTGRES_DB"),
    },
  };
}