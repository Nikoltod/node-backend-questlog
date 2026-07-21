import { setTimeout as delay } from "node:timers/promises";
import Fastify, {
    type FastifyInstance,
} from "fastify";

import {
    checkDatabaseReadiness,
    closeDatabasePool,
} from "./database.js";

export type ApplicationState = {
    isShuttingDown: boolean;
};


export function buildApp(
    applicationState: ApplicationState,
): FastifyInstance {
    const app = Fastify({
        logger: true,
        /*
        * Close idle keep-alive connections during shutdown,
        * but do not destroy connections with active requests.
        */
        forceCloseConnections: "idle",

        /*
         * Once app.close() begins, new requests receive 503.
         */
        return503OnClosing: true,
    });

    app.addHook("onRequest", async (request, reply) => {
        const isHealthRequest = request.url.startsWith("/health");

        if (
            applicationState.isShuttingDown &&
            !isHealthRequest
        ) {
            return reply.code(503).send({
                error: "SERVICE_UNAVAILABLE",
                message: "Application shutdown is in progress",
            });
        }
    });

    app.get("/health", async () => {
        return {
            status: "ok",
            endpoints: {
                liveness: "/health/live",
                readiness: "/health/ready",
            },
        };
    });

    app.get("/health/live", async () => {
        return {
            status: "alive",
        };
    });

    app.get("/health/ready", async (request, reply) => {
        if (applicationState.isShuttingDown) {
            return reply.code(503).send({
                status: "not-ready",
                reason: "shutdown-in-progress",
            });
        }

        try {
            await checkDatabaseReadiness();

            return {
                status: "ready",
                checks: {
                    database: "reachable",
                },
            };
        } catch (error) {
            request.log.error(
                {
                    err: error,
                },
                "PostgreSQL readiness check failed",
            );

            return reply.code(503).send({
                status: "not-ready",
                checks: {
                    database: "unreachable",
                },
            });
        }
    });

    app.get("/slow", async (request) => {
        request.log.info("Slow request started");

        await delay(10_000);

        request.log.info("Slow request finished");

        return {
            message: "Slow request completed",
        };
    });

    app.addHook("onClose", async () => {
        app.log.info("Closing PostgreSQL connection pool");

        await closeDatabasePool();

        app.log.info("PostgreSQL connection pool closed");
    });

    return app;
}