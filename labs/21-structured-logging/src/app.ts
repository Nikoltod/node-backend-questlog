import { setTimeout as delay } from "node:timers/promises";
import Fastify, {
  type FastifyInstance,
} from "fastify";

import { config } from "./config.js";
import {
  checkDatabaseReadiness,
  closeDatabasePool,
  getDatabaseTime,
} from "./database.js";
import { generateRequestId } from "./request-id.js";

export type ApplicationState = {
  isShuttingDown: boolean;
};

export function buildApp(
  applicationState: ApplicationState,
): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },

    /*
     * We create our own request start and completion logs,
     * so disable Fastify's automatic request logs to avoid
     * duplicate entries.
     */
    disableRequestLogging: true,

    /*
     * Called for every new request.
     */
    genReqId: generateRequestId,

    /*
     * Close idle connections during shutdown but allow
     * active requests to finish.
     */
    forceCloseConnections: "idle",

    return503OnClosing: true,
  });

  app.addHook("onRequest", async (request, response) => {
    /*
     * Return the request ID to the client.
     */
    response.header("x-request-id", request.id);

    request.log.info(
      {
        method: request.method,
        url: request.url,
      },
      "Request started",
    );

    const isHealthRequest =
      request.url.startsWith("/health");

    if (
      applicationState.isShuttingDown &&
      !isHealthRequest
    ) {
      return response.code(503).send({
        error: "SERVICE_UNAVAILABLE",
        message: "Application shutdown is in progress",
        requestId: request.id,
      });
    }
  });

  /*
   * onResponse runs after the response has been sent.
   *
   * It is useful for recording the final status and
   * total request duration.
   */
  app.addHook("onResponse", async (request, response) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: response.statusCode,
        responseTimeMs: Number(
          response.elapsedTime.toFixed(2),
        ),
      },
      "Request completed",
    );
  });

  /*
   * Record clients that disconnect before the request
   * finishes.
   */
  app.addHook("onRequestAbort", async (request) => {
    request.log.warn(
      {
        method: request.method,
        url: request.url,
      },
      "Client aborted request",
    );
  });

  app.setErrorHandler((error: any, request, response) => {
    request.log.error(
      {
        err: error,
        method: request.method,
        url: request.url,
      },
      "Request failed",
    );

    const statusCode =
      error.statusCode &&
      error.statusCode >= 400 &&
      error.statusCode < 500
        ? error.statusCode
        : 500;

    const errorCode =
      statusCode === 500
        ? "INTERNAL_SERVER_ERROR"
        : "REQUEST_ERROR";

    return response.code(statusCode).send({
      error: errorCode,
      message:
        statusCode === 500
          ? "An unexpected error occurred"
          : error.message,
      requestId: request.id,
    });
  });

  app.get("/health", async (request) => {
    return {
      status: "ok",
      requestId: request.id,
      endpoints: {
        liveness: "/health/live",
        readiness: "/health/ready",
      },
    };
  });

  app.get("/health/live", async (request) => {
    return {
      status: "alive",
      requestId: request.id,
    };
  });

  app.get("/health/ready", async (request, response) => {
    if (applicationState.isShuttingDown) {
      return response.code(503).send({
        status: "not-ready",
        reason: "shutdown-in-progress",
        requestId: request.id,
      });
    }

    try {
      await checkDatabaseReadiness();

      return {
        status: "ready",
        checks: {
          database: "reachable",
        },
        requestId: request.id,
      };
    } catch (error) {
      request.log.error(
        {
          err: error,
          component: "postgres",
          operation: "readiness-check",
        },
        "PostgreSQL readiness check failed",
      );

      return response.code(503).send({
        status: "not-ready",
        checks: {
          database: "unreachable",
        },
        requestId: request.id,
      });
    }
  });

  app.get("/demo/success", async (request) => {
    request.log.info(
      {
        operation: "successful-demo",
      },
      "Running successful demo operation",
    );

    return {
      message: "Operation completed successfully",
      requestId: request.id,
    };
  });

  app.get("/demo/database-time", async (request) => {
    request.log.debug(
      {
        component: "postgres",
        operation: "read-database-time",
      },
      "Querying PostgreSQL",
    );

    const databaseTime = await getDatabaseTime();

    request.log.info(
      {
        component: "postgres",
        operation: "read-database-time",
        databaseTime,
      },
      "PostgreSQL query completed",
    );

    return {
      databaseTime,
      requestId: request.id,
    };
  });

  app.get("/demo/error", async (request) => {
    request.log.info(
      {
        operation: "simulated-failure",
      },
      "Starting operation that will fail",
    );

    throw new Error(
      "Simulated payment provider connection failure",
    );
  });

  app.get("/slow", async (request) => {
    request.log.info(
      {
        operation: "slow-request",
        delayMs: 10_000,
      },
      "Slow request started",
    );

    await delay(10_000);

    request.log.info(
      {
        operation: "slow-request",
      },
      "Slow request finished",
    );

    return {
      message: "Slow request completed",
      requestId: request.id,
    };
  });

  app.addHook("onClose", async () => {
    app.log.info(
      {
        component: "postgres",
      },
      "Closing PostgreSQL connection pool",
    );

    await closeDatabasePool();

    app.log.info(
      {
        component: "postgres",
      },
      "PostgreSQL connection pool closed",
    );
  });

  return app;
}