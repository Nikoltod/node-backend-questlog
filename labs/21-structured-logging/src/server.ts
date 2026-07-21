import { setTimeout as delay } from "node:timers/promises";

import { buildApp } from "./app.js";
import { config } from "./config.js";
import {
    closeDatabasePool,
    registerDatabasePoolErrorHandler,
} from "./database.js";

const applicationState = {
    isShuttingDown: false,
};

const app = buildApp(applicationState);

let shutdownPromise: Promise<void> | undefined;

registerDatabasePoolErrorHandler(app.log);

async function performShutdown(
    signal: NodeJS.Signals,
): Promise<void> {
    applicationState.isShuttingDown = true;

    app.log.info(
        {
            signal,
            drainDelayMs: config.shutdownDrainDelayMs,
            timeoutMs: config.shutdownTimeoutMs,
        },
        "Graceful shutdown started",
    );

    const forcedShutdownTimer = setTimeout(() => {
        app.log.fatal(
            {
                signal,
                timeoutMs: config.shutdownTimeoutMs,
            },
            "Graceful shutdown timed out",
        );

        process.exit(1);
    }, config.shutdownTimeoutMs);

    forcedShutdownTimer.unref();

    try {
        if (config.shutdownDrainDelayMs > 0) {
            app.log.info(
                {
                    drainDelayMs: config.shutdownDrainDelayMs,
                },
                "Waiting for traffic to drain",
            );

            await delay(config.shutdownDrainDelayMs);
        }

        app.log.info("Closing Fastify server");

        await app.close();

        clearTimeout(forcedShutdownTimer);

        app.log.info(
            {
                signal,
            },
            "Graceful shutdown completed",
        );

        process.exitCode = 0;
    } catch (error) {
        clearTimeout(forcedShutdownTimer);

        app.log.error(
            {
                err: error,
                signal,
            },
            "Graceful shutdown failed",
        );

        process.exitCode = 1;
    }
}

function requestShutdown(
    signal: NodeJS.Signals,
): Promise<void> {
    if (!shutdownPromise) {
        shutdownPromise = performShutdown(signal);
    } else {
        app.log.warn(
            {
                signal,
            },
            "Graceful shutdown is already running",
        );
    }

    return shutdownPromise;
}

process.once("SIGINT", () => {
    void requestShutdown("SIGINT");
});

process.once("SIGTERM", () => {
    void requestShutdown("SIGTERM");
});

async function startServer(): Promise<void> {
    try {
        await app.listen({
            host: config.host,
            port: config.port,
        });

        app.log.info(
            {
                pid: process.pid,
                host: config.host,
                port: config.port,
                logLevel: config.logLevel,
            },
            "Application started",
        );
    } catch (error) {
        app.log.error(
            {
                err: error,
            },
            "Failed to start the application",
        );

        try {
            await closeDatabasePool();
        } catch (databaseError) {
            app.log.error(
                {
                    err: databaseError,
                },
                "Failed to close PostgreSQL after startup failure",
            );
        }

        process.exitCode = 1;
    }
}

void startServer();