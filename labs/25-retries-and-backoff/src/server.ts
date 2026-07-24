import Fastify from "fastify";

import { retryWithBackoff } from "./retry.js";

const PORT = 3000;

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 1_000;
const TOTAL_DEADLINE_MS = 5_000;

const app = Fastify({
  logger: true,
});

/*
 * Stores how many times each simulated downstream
 * operation has been called.
 */
const attemptsByKey = new Map<string, number>();

type KeyParams = {
  key: string;
};

type FailureQuery = {
  failures?: string;
};

type DownstreamSuccess = {
  message: string;
  key: string;
  attempt: number;
  configuredFailures: number;
};

class DownstreamHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly responseBody: unknown,
  ) {
    super(
      `Downstream returned HTTP ${statusCode}`,
    );

    this.name = "DownstreamHttpError";
  }
}

function parseFailureCount(
  rawValue: string | undefined,
): number | null {
  const failures = Number(rawValue ?? "2");

  if (
    !Number.isInteger(failures) ||
    failures < 0 ||
    failures > 10
  ) {
    return null;
  }

  return failures;
}

function buildLocalUrl(path: string): string {
  return `http://127.0.0.1:${PORT}${path}`;
}

async function fetchJson<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(
    buildLocalUrl(path),
    {
      signal,
    },
  );

  const responseBody =
    (await response.json()) as unknown;

  /*
   * fetch does not throw merely because the HTTP
   * response is 400 or 503.
   *
   * We must check response.ok ourselves.
   */
  if (!response.ok) {
    throw new DownstreamHttpError(
      response.status,
      responseBody,
    );
  }

  return responseBody as T;
}

/*
 * This is our retry policy for this lab.
 *
 * It is not a universal list for every service.
 */
function shouldRetryDownstreamError(
  error: unknown,
): boolean {
  if (error instanceof DownstreamHttpError) {
    return [
      429,
      502,
      503,
      504,
    ].includes(error.statusCode);
  }

  /*
   * Node fetch commonly reports network failures
   * through a TypeError.
   */
  return error instanceof TypeError;
}

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

/*
 * Simulated flaky downstream service.
 *
 * failures=2 means:
 *
 * attempt 1 -> 503
 * attempt 2 -> 503
 * attempt 3 -> 200
 */
app.get<{
  Params: KeyParams;
  Querystring: FailureQuery;
}>(
  "/downstream/flaky/:key",
  async (request, reply) => {
    const failures = parseFailureCount(
      request.query.failures,
    );

    if (failures === null) {
      return reply.code(400).send({
        error: "INVALID_FAILURE_COUNT",
        message:
          "failures must be an integer between 0 and 10",
      });
    }

    const key = request.params.key;

    const attempt =
      (attemptsByKey.get(key) ?? 0) + 1;

    attemptsByKey.set(key, attempt);

    if (attempt <= failures) {
      request.log.warn(
        {
          key,
          attempt,
          configuredFailures: failures,
        },
        "Downstream returned a temporary failure",
      );

      return reply.code(503).send({
        error: "TEMPORARY_FAILURE",
        key,
        attempt,
        configuredFailures: failures,
      });
    }

    request.log.info(
      {
        key,
        attempt,
        configuredFailures: failures,
      },
      "Downstream operation succeeded",
    );

    return {
      message: "Downstream operation succeeded",
      key,
      attempt,
      configuredFailures: failures,
    };
  },
);

/*
 * Simulated permanent client error.
 *
 * Retrying will not repair an invalid request.
 */
app.get(
  "/downstream/permanent-error",
  async (_request, reply) => {
    return reply.code(400).send({
      error: "INVALID_REQUEST",
      message:
        "The request is permanently invalid",
    });
  },
);

/*
 * Reset a key so tests are repeatable.
 */
app.delete<{
  Params: KeyParams;
}>(
  "/downstream/state/:key",
  async (request) => {
    attemptsByKey.delete(request.params.key);

    return {
      message: "Downstream state reset",
      key: request.params.key,
    };
  },
);

/*
 * Call the flaky downstream only once.
 */
app.get<{
  Params: KeyParams;
  Querystring: FailureQuery;
}>(
  "/demo/no-retry/:key",
  async (request, reply) => {
    const failures = parseFailureCount(
      request.query.failures,
    );

    if (failures === null) {
      return reply.code(400).send({
        error: "INVALID_FAILURE_COUNT",
      });
    }

    const signal = AbortSignal.timeout(
      TOTAL_DEADLINE_MS,
    );

    try {
      const result =
        await fetchJson<DownstreamSuccess>(
          `/downstream/flaky/${encodeURIComponent(
            request.params.key,
          )}?failures=${failures}`,
          signal,
        );

      return {
        mode: "no-retry",
        result,
        requestId: request.id,
      };
    } catch (error) {
      if (signal.aborted) {
        return reply.code(504).send({
          error: "DEADLINE_EXCEEDED",
          requestId: request.id,
        });
      }

      if (error instanceof DownstreamHttpError) {
        return reply.code(502).send({
          error: "DOWNSTREAM_FAILED",
          downstreamStatus: error.statusCode,
          attemptsMade: 1,
          requestId: request.id,
        });
      }

      throw error;
    }
  },
);

/*
 * Call the flaky downstream with retry,
 * exponential backoff, jitter, and a total deadline.
 */
app.get<{
  Params: KeyParams;
  Querystring: FailureQuery;
}>(
  "/demo/retry/:key",
  async (request, reply) => {
    const failures = parseFailureCount(
      request.query.failures,
    );

    if (failures === null) {
      return reply.code(400).send({
        error: "INVALID_FAILURE_COUNT",
      });
    }

    const key = request.params.key;

    const signal = AbortSignal.timeout(
      TOTAL_DEADLINE_MS,
    );

    let attemptsMade = 0;

    try {
      const result = await retryWithBackoff(
        async (attempt) => {
          attemptsMade = attempt;

          request.log.info(
            {
              key,
              attempt,
              maxAttempts: MAX_ATTEMPTS,
            },
            "Calling downstream service",
          );

          return fetchJson<DownstreamSuccess>(
            `/downstream/flaky/${encodeURIComponent(
              key,
            )}?failures=${failures}`,
            signal,
          );
        },
        {
          maxAttempts: MAX_ATTEMPTS,
          baseDelayMs: BASE_DELAY_MS,
          maxDelayMs: MAX_DELAY_MS,
          signal,

          shouldRetry:
            shouldRetryDownstreamError,

          onRetry: ({
            attempt,
            nextAttempt,
            delayMs,
            error,
          }) => {
            request.log.warn(
              {
                err: error,
                key,
                attempt,
                nextAttempt,
                delayMs,
              },
              "Temporary failure; retry scheduled",
            );
          },
        },
      );

      return {
        mode: "retry-with-backoff",
        attemptsMade,
        result,
        requestId: request.id,
      };
    } catch (error) {
      if (signal.aborted) {
        return reply.code(504).send({
          error: "RETRY_DEADLINE_EXCEEDED",
          attemptsMade,
          requestId: request.id,
        });
      }

      if (
        error instanceof DownstreamHttpError ||
        error instanceof TypeError
      ) {
        request.log.error(
          {
            err: error,
            key,
            attemptsMade,
          },
          "Downstream failed after retries",
        );

        return reply.code(502).send({
          error: "DOWNSTREAM_RETRIES_EXHAUSTED",
          attemptsMade,
          requestId: request.id,
        });
      }

      throw error;
    }
  },
);

/*
 * Proves that a permanent 400 response is not retried.
 */
app.get(
  "/demo/permanent-error",
  async (request, reply) => {
    const signal = AbortSignal.timeout(
      TOTAL_DEADLINE_MS,
    );

    let attemptsMade = 0;

    try {
      await retryWithBackoff(
        async (attempt) => {
          attemptsMade = attempt;

          return fetchJson(
            "/downstream/permanent-error",
            signal,
          );
        },
        {
          maxAttempts: MAX_ATTEMPTS,
          baseDelayMs: BASE_DELAY_MS,
          maxDelayMs: MAX_DELAY_MS,
          signal,

          shouldRetry:
            shouldRetryDownstreamError,
        },
      );

      return {
        message: "Unexpected success",
      };
    } catch (error) {
      if (error instanceof DownstreamHttpError) {
        return reply.code(502).send({
          error: "PERMANENT_DOWNSTREAM_ERROR",
          downstreamStatus: error.statusCode,
          attemptsMade,
          retried: attemptsMade > 1,
          requestId: request.id,
        });
      }

      throw error;
    }
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
        maxAttempts: MAX_ATTEMPTS,
        totalDeadlineMs: TOTAL_DEADLINE_MS,
      },
      "Retry demonstration started",
    );
  } catch (error) {
    app.log.error(
      {
        err: error,
      },
      "Failed to start retry demonstration",
    );

    process.exitCode = 1;
  }
}

void startServer();