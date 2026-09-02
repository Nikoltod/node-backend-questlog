import { setTimeout as delay } from "node:timers/promises";
import Fastify from "fastify";

import {
  Bulkhead,
} from "./bulkhead.js";

const PORT = 3000;

const MAX_CONCURRENT = 2;
const MAX_QUEUE = 3;

const app = Fastify({
  logger: true,
});

const bulkhead = new Bulkhead(
  MAX_CONCURRENT,
  MAX_QUEUE,
);

let activeDependencyCalls = 0;
let maximumObservedConcurrency = 0;

async function expensiveDependencyCall(
  operationId: number,
  durationMs: number,
): Promise<{
  operationId: number;
  durationMs: number;
}> {
  activeDependencyCalls += 1;

  maximumObservedConcurrency = Math.max(
    maximumObservedConcurrency,
    activeDependencyCalls,
  );

  app.log.info(
    {
      operationId,
      activeDependencyCalls,
      maximumObservedConcurrency,
    },
    "Expensive dependency call started",
  );

  try {
    /*
     * Simulate slow asynchronous dependency work.
     *
     * This waits without blocking the event loop.
     */
    await delay(durationMs);

    return {
      operationId,
      durationMs,
    };
  } finally {
    activeDependencyCalls -= 1;

    app.log.info(
      {
        operationId,
        activeDependencyCalls,
      },
      "Expensive dependency call finished",
    );
  }
}

function resetObservation(): void {
  activeDependencyCalls = 0;
  maximumObservedConcurrency = 0;
}

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

app.get("/bulkhead/status", async () => {
  return {
    bulkhead: bulkhead.getStatus(),

    dependency: {
      activeCalls: activeDependencyCalls,
      maximumObservedConcurrency,
    },
  };
});

/*
 * Run eight operations without any concurrency limit.
 */
app.get(
  "/demo/unlimited",
  async (request) => {
    resetObservation();

    const operations = Array.from(
      {
        length: 8,
      },
      (_, index) =>
        expensiveDependencyCall(
          index + 1,
          1_000,
        ),
    );

    const results = await Promise.all(
      operations,
    );

    return {
      mode: "unlimited",
      operationsRequested: 8,
      maximumObservedConcurrency,
      results,
      requestId: request.id,
    };
  },
);

/*
 * Run the same eight operations through the bulkhead.
 *
 * Configuration:
 *
 * 2 may run
 * 3 may wait
 * remaining operations are rejected
 */
app.get(
  "/demo/limited",
  async (request) => {
    resetObservation();

    const operations = Array.from(
      {
        length: 8,
      },
      (_, index) => {
        const operationId = index + 1;

        return bulkhead.execute(() =>
          expensiveDependencyCall(
            operationId,
            1_000,
          ),
        );
      },
    );

    const results =
      await Promise.allSettled(
        operations,
      );

    const successful =
      results.filter(
        (result) =>
          result.status === "fulfilled",
      ).length;

    const rejected =
      results.filter(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof
            Error,
      ).length;

    return {
      mode: "bulkhead",
      operationsRequested: 8,

      successful,
      rejected,

      maximumObservedConcurrency,

      bulkhead: bulkhead.getStatus(),

      requestId: request.id,
    };
  },
);

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
        maxConcurrent:
          MAX_CONCURRENT,
        maxQueue:
          MAX_QUEUE,
      },
      "Bulkhead demonstration started",
    );
  } catch (error) {
    app.log.error(
      {
        err: error,
      },
      "Failed to start bulkhead demonstration",
    );

    process.exitCode = 1;
  }
}

void startServer();