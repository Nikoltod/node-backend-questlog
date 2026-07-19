import Fastify, {
    type FastifyInstance,
} from "fastify";
import { checkDatabaseReadiness } from "./database";

export function buildApp(): FastifyInstance {
    const app = Fastify({
        logger: true,
    });

    /*
       * General health endpoint.
       *
       * This is useful to humans exploring the application,
       * but infrastructure should use the specific live and
       * ready endpoints.
       */
    app.get("/health", async () => {
        return {
            status: "ok",
            endpoints: {
                liveness: "/health/live",
                readiness: "/health/ready",
            },
        };
    });


    /*
     * Liveness check.
     *
     * Do not query PostgreSQL here.
     *
     * If Fastify can handle this request, the Node.js
     * process is alive and its event loop can respond.
     */
    app.get("/health/live", async () => {
        return {
            status: "alive",
        };
    });

    /*
 * Readiness check.
 *
 * PostgreSQL is required by this application, so the
 * application is not ready when PostgreSQL cannot be
 * reached.
 */
    app.get("/health/ready", async (request, reply) => {
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


    return app;
}