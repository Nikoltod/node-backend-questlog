import { fileURLToPath } from "node:url";
import { config as loadEnvironment } from "dotenv";

const environmentFilePath = fileURLToPath(
  new URL("../.env", import.meta.url),
);

const environmentResult = loadEnvironment({
  path: environmentFilePath,
});

if (environmentResult.error) {
  throw new Error(
    `Could not load environment file at ${environmentFilePath}: ${environmentResult.error.message}`,
  );
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function readPort(): number {
  const rawPort = process.env.PORT ?? "3000";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `PORT must be an integer between 1 and 65535. Received: ${rawPort}`,
    );
  }

  return port;
}

export const config = Object.freeze({
  host: process.env.HOST ?? "0.0.0.0",
  port: readPort(),
  databaseUrl: requireEnvironmentVariable("DATABASE_URL"),
});