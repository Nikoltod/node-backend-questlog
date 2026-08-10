import { setTimeout as delay } from "node:timers/promises";
import Fastify from "fastify";

import {
  CircuitBreaker,
  CircuitOpenError,
} from "./circuit-breaker.js";

const PORT = 3000;

const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 5_000;

const app = Fastify({
  logger: true,
});

type DependencyMode =
  | "healthy"
  | "failing";

let dependencyMode: DependencyMode = "healthy";
let dependencyCallCount = 0;

class DependencyUnavailableError extends Error {
  constructor() {
    super("Simulated dependency is unavailable");
    this.name = "DependencyUnavailableError";
  }
}

const circuitBreaker = new CircuitBreaker({
  failureThreshold: FAILURE_THRESHOLD,
  resetTimeoutMs: RESET_TIMEOUT_MS,

  onStateChange(
    previousState,
    nextState,
  ): void {
    app.log.warn(
      {
        previousState,
        nextState,
      },
      "Circuit breaker state changed",
    );
  },
});

async function callSimulatedDependency(): Promise<{
  message: string;
  dependencyCallCount: number;
}> {
  dependencyCallCount += 1;

  /*
   * Simulate network latency.
   */
  await delay(150);

  if (dependencyMode === "failing") {
    throw new DependencyUnavailableError();
  }

  return {
    message: "Dependency responded successfully",
    dependencyCallCount,
  };
}

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

app.get("/circuit/status", async () => {
  return {
    circuit: circuitBreaker.getStatus(),
    dependency: {
      mode: dependencyMode,
      callCount: dependencyCallCount,
    },
  };
});

app.post("/circuit/reset", async () => {
  circuitBreaker.reset();

  return {
    message: "Circuit breaker reset",
    circuit: circuitBreaker.getStatus(),
  };
});

app.post("/dependency/fail", async () => {
  dependencyMode = "failing";

  return {
    message: "Dependency will now fail",
    dependencyMode,
  };
});

app.post("/dependency/recover", async () => {
  dependencyMode = "healthy";

  return {
    message: "Dependency recovered",
    dependencyMode,
  };
});

app.post("/dependency/reset-count", async () => {
  dependencyCallCount = 0;

  return {
    message: "Dependency call count reset",
    dependencyCallCount,
  };
});

app.get("/demo/call", async (request, reply) => {
  const callCountBefore =
    dependencyCallCount;

  request.log.info(
    {
      circuitState:
        circuitBreaker.getStatus().state,
      dependencyMode,
    },
    "Attempting protected dependency call",
  );

  try {
    const result = await circuitBreaker.execute(
      callSimulatedDependency,
    );

    return {
      message: "Protected call succeeded",
      result,
      circuit: circuitBreaker.getStatus(),
      requestId: request.id,
    };
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      request.log.warn(
        {
          circuitState: "OPEN",
          retryAfterMs: error.retryAfterMs,
        },
        "Dependency call blocked by circuit breaker",
      );

      return reply.code(503).send({
        error: "CIRCUIT_OPEN",
        message:
          "Dependency calls are temporarily disabled",
        retryAfterMs: error.retryAfterMs,

        /*
         * These values prove that the dependency
         * was not called.
         */
        dependencyCalled: false,
        dependencyCallCountBefore:
          callCountBefore,
        dependencyCallCountAfter:
          dependencyCallCount,

        requestId: request.id,
      });
    }

    if (
      error instanceof
      DependencyUnavailableError
    ) {
      request.log.error(
        {
          err: error,
          circuit:
            circuitBreaker.getStatus(),
          dependencyCallCount,
        },
        "Dependency call failed",
      );

      return reply.code(502).send({
        error: "DEPENDENCY_UNAVAILABLE",
        message:
          "The dependency did not respond successfully",
        circuit: circuitBreaker.getStatus(),
        dependencyCallCount,
        requestId: request.id,
      });
    }

    throw error;
  }
});

async function startServer(): Promise<void> {
  try {
    await app.listen({
      host: "0.0.0.0",
      port: PORT,
    });

    app.log.info(
      {
        pid: process.pid,
        port: PORT,
        failureThreshold:
          FAILURE_THRESHOLD,
        resetTimeoutMs:
          RESET_TIMEOUT_MS,
      },
      "Circuit breaker demonstration started",
    );
  } catch (error) {
    app.log.error(
      {
        err: error,
      },
      "Failed to start circuit breaker demonstration",
    );

    process.exitCode = 1;
  }
}

void startServer();