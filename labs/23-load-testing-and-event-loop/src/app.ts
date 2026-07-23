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
import {
  getMetricsContentType,
  isMetricsRequest,
  recordRequestAborted,
  recordRequestCompleted,
  recordRequestStarted,
  renderMetrics,
} from "./metrics.js";
import {
  blockEventLoop,
  refreshPerformanceMetrics,
  stopPerformanceMonitoring,
} from "./performance.js";
import { generateRequestId } from "./request-id.js";

export type ApplicationState = {
  isShuttingDown: boolean;
};

function isControlPlaneRequest(
  url: string,
): boolean {
  return (
    url.startsWith("/health") ||
    url.startsWith("/metrics")
  );
}

function parseDuration(
  rawValue: string,
  maximumMilliseconds: number,
): number | null {
  const milliseconds = Number(rawValue);

  if (
    !Number.isInteger(milliseconds) ||
    milliseconds < 0 ||
    milliseconds > maximumMilliseconds
  ) {
    return null;
  }

  return milliseconds;
}

export function buildApp(
  applicationState: ApplicationState,
): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },

    disableRequestLogging: true,
    genReqId: generateRequestId,

    forceCloseConnections: "idle",
    return503OnClosing: true,
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);

    recordRequestStarted(request);

    if (!isMetricsRequest(request)) {
      request.log.info(
        {
          method: request.method,
          url: request.url,
        },
        "Request started",
      );
    }

    if (
      applicationState.isShuttingDown &&
      !isControlPlaneRequest(request.url)
    ) {
      return reply.code(503).send({
        error: "SERVICE_UNAVAILABLE",
        message: "Application shutdown is in progress",
        requestId: request.id,
      });
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    recordRequestCompleted(request, reply);

    if (!isMetricsRequest(request)) {
      request.log.info(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTimeMs: Number(
            reply.elapsedTime.toFixed(2),
          ),
        },
        "Request completed",
      );
    }
  });

  app.addHook("onRequestAbort", async (request) => {
    recordRequestAborted(request);

    request.log.warn(
      {
        method: request.method,
        url: request.url,
      },
      "Client aborted request",
    );
  });

  app.setErrorHandler((error:any, request, reply) => {
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

    return reply.code(statusCode).send({
      error:
        statusCode === 500
          ? "INTERNAL_SERVER_ERROR"
          : "REQUEST_ERROR",

      message:
        statusCode === 500
          ? "An unexpected error occurred"
          : error.message,

      requestId: request.id,
    });
  });

  app.get("/metrics", async (_request, reply) => {
    refreshPerformanceMetrics();

    reply.header(
      "content-type",
      getMetricsContentType(),
    );

    return reply.send(await renderMetrics());
  });

  app.get("/health", async (request) => {
    return {
      status: "ok",
      requestId: request.id,
      endpoints: {
        liveness: "/health/live",
        readiness: "/health/ready",
        metrics: "/metrics",
      },
    };
  });

  app.get("/health/live", async (request) => {
    return {
      status: "alive",
      requestId: request.id,
    };
  });

  app.get("/health/ready", async (request, reply) => {
    if (applicationState.isShuttingDown) {
      return reply.code(503).send({
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

      return reply.code(503).send({
        status: "not-ready",
        checks: {
          database: "unreachable",
        },
        requestId: request.id,
      });
    }
  });

  /*
   * Very small route used as a responsiveness probe.
   */
  app.get("/demo/ping", async (request) => {
    return {
      message: "pong",
      requestId: request.id,
    };
  });

  app.get(
    "/demo/database-time",
    async (request) => {
      const databaseTime = await getDatabaseTime();

      return {
        databaseTime,
        requestId: request.id,
      };
    },
  );

  /*
   * Slow but non-blocking.
   *
   * The async function pauses while the timer Promise
   * is pending. The event loop can process other work.
   */
  app.get<{
    Params: {
      milliseconds: string;
    };
  }>(
    "/demo/async-delay/:milliseconds",
    async (request, reply) => {
      const milliseconds = parseDuration(
        request.params.milliseconds,
        5_000,
      );

      if (milliseconds === null) {
        return reply.code(400).send({
          error: "INVALID_DURATION",
          message:
            "milliseconds must be an integer between 0 and 5000",
          requestId: request.id,
        });
      }

      await delay(milliseconds);

      return {
        type: "non-blocking",
        delayMs: milliseconds,
        requestId: request.id,
      };
    },
  );

  /*
   * Deliberately blocks the main JavaScript thread.
   *
   * Keep the maximum low so the demonstration cannot
   * accidentally freeze the service for a long period.
   */
  app.get<{
    Params: {
      milliseconds: string;
    };
  }>(
    "/demo/blocking/:milliseconds",
    async (request, reply) => {
      const milliseconds = parseDuration(
        request.params.milliseconds,
        500,
      );

      if (milliseconds === null) {
        return reply.code(400).send({
          error: "INVALID_DURATION",
          message:
            "milliseconds must be an integer between 0 and 500",
          requestId: request.id,
        });
      }

      request.log.warn(
        {
          operation: "block-event-loop",
          durationMs: milliseconds,
        },
        "Running deliberately blocking JavaScript",
      );

      blockEventLoop(milliseconds);

      return {
        type: "blocking",
        blockedForMs: milliseconds,
        requestId: request.id,
      };
    },
  );

  app.get("/demo/error", async () => {
    throw new Error(
      "Simulated downstream service failure",
    );
  });

  app.addHook("onClose", async () => {
    app.log.info(
      "Stopping event-loop performance monitoring",
    );

    stopPerformanceMonitoring();

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