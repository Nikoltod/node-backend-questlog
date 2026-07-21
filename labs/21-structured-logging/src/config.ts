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

function readPositiveInteger(
    name: string,
    defaultValue: number,
): number {
    const rawValue = process.env[name] ?? String(defaultValue);
    const value = Number(rawValue);

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(
            `${name} must be a positive integer. Received: ${rawValue}`,
        );
    }

    return value;
}

function readNonNegativeInteger(
    name: string,
    defaultValue: number,
): number {
    const rawValue = process.env[name] ?? String(defaultValue);
    const value = Number(rawValue);

    if (!Number.isInteger(value) || value < 0) {
        throw new Error(
            `${name} must be a non-negative integer. Received: ${rawValue}`,
        );
    }

    return value;
}

const allowedLogLevels = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
    "silent",
] as const;

type LogLevel = (typeof allowedLogLevels)[number];

function readLogLevel(): LogLevel {
    const value = process.env.LOG_LEVEL ?? "info";

    if (!allowedLogLevels.includes(value as LogLevel)) {
        throw new Error(
            `LOG_LEVEL must be one of: ${allowedLogLevels.join(", ")}. Received: ${value}`,
        );
    }

    return value as LogLevel;
}

const shutdownDrainDelayMs = readNonNegativeInteger(
    "SHUTDOWN_DRAIN_DELAY_MS",
    3_000,
);

const shutdownTimeoutMs = readPositiveInteger(
    "SHUTDOWN_TIMEOUT_MS",
    20_000,
);

if (shutdownTimeoutMs <= shutdownDrainDelayMs) {
    throw new Error(
        "SHUTDOWN_TIMEOUT_MS must be greater than SHUTDOWN_DRAIN_DELAY_MS",
    );
}

export const config = Object.freeze({
    host: process.env.HOST ?? "0.0.0.0",
    port: readPositiveInteger("PORT", 3_000),
    databaseUrl: requireEnvironmentVariable("DATABASE_URL"),
    logLevel: readLogLevel(),
    shutdownDrainDelayMs,
    shutdownTimeoutMs,
});